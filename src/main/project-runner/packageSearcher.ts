import https from 'https';
import { CURATED_PACKAGES } from './curatedPackages';
import { EcosystemType, PackageSearchResult } from '../../shared/projectRunnerTypes';

function fetchJsonWithTimeout(url: string, timeoutMs: number = 3000): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'TerminalManager-ProjectRunner/1.0',
          Accept: 'application/json',
        },
        timeout: timeoutMs,
      },
      (res) => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

export async function searchPackages(
  ecosystem: EcosystemType,
  query: string,
  isOffline: boolean = false
): Promise<PackageSearchResult[]> {
  const trimmed = query.trim().toLowerCase();
  const curated = (CURATED_PACKAGES[ecosystem] || []).filter((p) =>
    p.toLowerCase().includes(trimmed)
  );

  const fallbackResults: PackageSearchResult[] = curated.slice(0, 10).map((name) => ({
    name,
  }));

  if (isOffline || !trimmed) {
    return fallbackResults;
  }

  try {
    if (ecosystem === 'node') {
      const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(trimmed)}&size=8`;
      const data = await fetchJsonWithTimeout(url, 3000);
      if (data && Array.isArray(data.objects)) {
        const results: PackageSearchResult[] = data.objects.map((obj: any) => ({
          name: obj.package.name,
          description: obj.package.description,
          version: obj.package.version,
        }));
        return results.length > 0 ? results : fallbackResults;
      }
    } else if (ecosystem === 'python') {
      // Direct PyPI query for exact or prefix
      const url = `https://pypi.org/pypi/${encodeURIComponent(trimmed)}/json`;
      const data = await fetchJsonWithTimeout(url, 3000);
      if (data && data.info) {
        return [
          {
            name: data.info.name,
            description: data.info.summary,
            version: data.info.version,
          },
          ...fallbackResults.filter((f) => f.name !== data.info.name),
        ].slice(0, 8);
      }
    }
  } catch {
    // Network failure, timeout, or offline - silently fallback to curated list
  }

  return fallbackResults;
}
