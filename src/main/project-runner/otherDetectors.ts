import fs from 'fs';
import path from 'path';
import {
  DetectedEcosystem,
  ProjectCommand,
} from '../../shared/projectRunnerTypes';


export function detectOtherEcosystems(
  folder: string,
  toolAvailability: Record<string, boolean>
): DetectedEcosystem[] {
  const detected: DetectedEcosystem[] = [];

  // ===================== 1. RUST =====================
  const cargoPath = path.join(folder, 'Cargo.toml');
  if (fs.existsSync(cargoPath)) {
    const isAvail = Boolean(toolAvailability['cargo']);
    const commands: ProjectCommand[] = [
      {
        id: 'rust-cargo-run',
        label: 'cargo run',
        commandText: 'cargo run',
        tool: 'cargo',
        args: ['run'],
        cwd: folder,
        category: 'run',
        isPrimary: true,
      },
      {
        id: 'rust-cargo-build',
        label: 'cargo build',
        commandText: 'cargo build',
        tool: 'cargo',
        args: ['build'],
        cwd: folder,
        category: 'run',
      },
      {
        id: 'rust-cargo-build-release',
        label: 'cargo build --release',
        commandText: 'cargo build --release',
        tool: 'cargo',
        args: ['build', '--release'],
        cwd: folder,
        category: 'run',
      },
      {
        id: 'rust-cargo-test',
        label: 'cargo test',
        commandText: 'cargo test',
        tool: 'cargo',
        args: ['test'],
        cwd: folder,
        category: 'run',
      },
      {
        id: 'rust-cargo-check',
        label: 'cargo check',
        commandText: 'cargo check',
        tool: 'cargo',
        args: ['check'],
        cwd: folder,
        category: 'lint',
      },
      {
        id: 'rust-cargo-clippy',
        label: 'cargo clippy',
        commandText: 'cargo clippy',
        tool: 'cargo',
        args: ['clippy'],
        cwd: folder,
        category: 'lint',
      },
      {
        id: 'rust-cargo-fmt',
        label: 'cargo fmt',
        commandText: 'cargo fmt',
        tool: 'cargo',
        args: ['fmt'],
        cwd: folder,
        category: 'lint',
      },
      {
        id: 'rust-cargo-clean',
        label: 'cargo clean',
        commandText: 'cargo clean',
        tool: 'cargo',
        args: ['clean'],
        cwd: folder,
        category: 'install',
        requiresConfirm: true,
        confirmMessage: 'Clean target directory with cargo clean?',
      },
      {
        id: 'rust-cargo-update',
        label: 'cargo update',
        commandText: 'cargo update',
        tool: 'cargo',
        args: ['update'],
        cwd: folder,
        category: 'install',
      },
    ];

    detected.push({
      type: 'rust',
      name: path.basename(folder),
      tool: 'cargo',
      toolAvailable: isAvail,
      toolMissingReason: isAvail ? undefined : 'cargo not found',
      groups: [
        {
          id: 'rust-group-all',
          title: 'Rust Commands',
          commands,
        },
      ],
    });
  }

  // ===================== 2. GO =====================
  const goModPath = path.join(folder, 'go.mod');
  if (fs.existsSync(goModPath)) {
    const isAvail = Boolean(toolAvailability['go']);
    const commands: ProjectCommand[] = [
      {
        id: 'go-run',
        label: 'go run .',
        commandText: 'go run .',
        tool: 'go',
        args: ['run', '.'],
        cwd: folder,
        category: 'run',
        isPrimary: true,
      },
      {
        id: 'go-build',
        label: 'go build',
        commandText: 'go build',
        tool: 'go',
        args: ['build'],
        cwd: folder,
        category: 'run',
      },
      {
        id: 'go-test',
        label: 'go test ./...',
        commandText: 'go test ./...',
        tool: 'go',
        args: ['test', './...'],
        cwd: folder,
        category: 'run',
      },
      {
        id: 'go-mod-tidy',
        label: 'go mod tidy',
        commandText: 'go mod tidy',
        tool: 'go',
        args: ['mod', 'tidy'],
        cwd: folder,
        category: 'install',
      },
      {
        id: 'go-mod-download',
        label: 'go mod download',
        commandText: 'go mod download',
        tool: 'go',
        args: ['mod', 'download'],
        cwd: folder,
        category: 'install',
      },
      {
        id: 'go-vet',
        label: 'go vet ./...',
        commandText: 'go vet ./...',
        tool: 'go',
        args: ['vet', './...'],
        cwd: folder,
        category: 'lint',
      },
      {
        id: 'go-fmt',
        label: 'go fmt ./...',
        commandText: 'go fmt ./...',
        tool: 'go',
        args: ['fmt', './...'],
        cwd: folder,
        category: 'lint',
      },
    ];

    detected.push({
      type: 'go',
      name: path.basename(folder),
      tool: 'go',
      toolAvailable: isAvail,
      toolMissingReason: isAvail ? undefined : 'go not found',
      groups: [
        {
          id: 'go-group-all',
          title: 'Go Commands',
          commands,
        },
      ],
    });
  }

  // ===================== 3. .NET =====================
  let hasDotNet = false;
  try {
    const files = fs.readdirSync(folder);
    hasDotNet = files.some((f) => f.endsWith('.sln') || f.endsWith('.csproj') || f.endsWith('.fsproj'));
  } catch {}

  if (hasDotNet) {
    const isAvail = Boolean(toolAvailability['dotnet']);
    const commands: ProjectCommand[] = [
      {
        id: 'dotnet-run',
        label: 'dotnet run',
        commandText: 'dotnet run',
        tool: 'dotnet',
        args: ['run'],
        cwd: folder,
        category: 'run',
        isPrimary: true,
      },
      {
        id: 'dotnet-build',
        label: 'dotnet build',
        commandText: 'dotnet build',
        tool: 'dotnet',
        args: ['build'],
        cwd: folder,
        category: 'run',
      },
      {
        id: 'dotnet-test',
        label: 'dotnet test',
        commandText: 'dotnet test',
        tool: 'dotnet',
        args: ['test'],
        cwd: folder,
        category: 'run',
      },
      {
        id: 'dotnet-restore',
        label: 'dotnet restore',
        commandText: 'dotnet restore',
        tool: 'dotnet',
        args: ['restore'],
        cwd: folder,
        category: 'install',
      },
      {
        id: 'dotnet-clean',
        label: 'dotnet clean',
        commandText: 'dotnet clean',
        tool: 'dotnet',
        args: ['clean'],
        cwd: folder,
        category: 'install',
      },
      {
        id: 'dotnet-watch-run',
        label: 'dotnet watch run',
        commandText: 'dotnet watch run',
        tool: 'dotnet',
        args: ['watch', 'run'],
        cwd: folder,
        category: 'run',
        isLongRunning: true,
      },
    ];

    detected.push({
      type: 'dotnet',
      name: path.basename(folder),
      tool: 'dotnet',
      toolAvailable: isAvail,
      toolMissingReason: isAvail ? undefined : 'dotnet not found',
      groups: [
        {
          id: 'dotnet-group-all',
          title: '.NET Commands',
          commands,
        },
      ],
    });
  }

  // ===================== 4. JAVA / KOTLIN =====================
  const pomPath = path.join(folder, 'pom.xml');
  const gradlePath = path.join(folder, 'build.gradle');
  const gradleKtsPath = path.join(folder, 'build.gradle.kts');
  const gradlewWin = path.join(folder, 'gradlew.bat');
  const gradlewUnix = path.join(folder, 'gradlew');
  const hasGradlew = fs.existsSync(gradlewWin) || fs.existsSync(gradlewUnix);

  if (fs.existsSync(pomPath)) {
    const isAvail = Boolean(toolAvailability['mvn']);
    detected.push({
      type: 'java',
      name: path.basename(folder),
      tool: 'mvn',
      toolAvailable: isAvail,
      toolMissingReason: isAvail ? undefined : 'mvn not found',
      groups: [
        {
          id: 'mvn-group-all',
          title: 'Maven Commands',
          commands: [
            {
              id: 'mvn-clean-install',
              label: 'mvn clean install',
              commandText: 'mvn clean install',
              tool: 'mvn',
              args: ['clean', 'install'],
              cwd: folder,
              category: 'run',
              isPrimary: true,
            },
            {
              id: 'mvn-test',
              label: 'mvn test',
              commandText: 'mvn test',
              tool: 'mvn',
              args: ['test'],
              cwd: folder,
              category: 'run',
            },
            {
              id: 'mvn-package',
              label: 'mvn package',
              commandText: 'mvn package',
              tool: 'mvn',
              args: ['package'],
              cwd: folder,
              category: 'run',
            },
            {
              id: 'mvn-spring-boot-run',
              label: 'mvn spring-boot:run',
              commandText: 'mvn spring-boot:run',
              tool: 'mvn',
              args: ['spring-boot:run'],
              cwd: folder,
              category: 'run',
              isLongRunning: true,
            },
          ],
        },
      ],
    });
  } else if (fs.existsSync(gradlePath) || fs.existsSync(gradleKtsPath)) {
    const toolName = hasGradlew ? (process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew') : 'gradle';
    const isAvail = hasGradlew || Boolean(toolAvailability['gradle']);
    detected.push({
      type: 'java',
      name: path.basename(folder),
      tool: hasGradlew ? 'gradlew' : 'gradle',
      toolAvailable: isAvail,
      toolMissingReason: isAvail ? undefined : 'gradle not found',
      groups: [
        {
          id: 'gradle-group-all',
          title: 'Gradle Commands',
          commands: [
            {
              id: 'gradle-build',
              label: `${toolName} build`,
              commandText: `${toolName} build`,
              tool: toolName,
              args: ['build'],
              cwd: folder,
              category: 'run',
              isPrimary: true,
            },
            {
              id: 'gradle-test',
              label: `${toolName} test`,
              commandText: `${toolName} test`,
              tool: toolName,
              args: ['test'],
              cwd: folder,
              category: 'run',
            },
            {
              id: 'gradle-bootrun',
              label: `${toolName} bootRun`,
              commandText: `${toolName} bootRun`,
              tool: toolName,
              args: ['bootRun'],
              cwd: folder,
              category: 'run',
              isLongRunning: true,
            },
          ],
        },
      ],
    });
  }

  // ===================== 5. PHP =====================
  const composerPath = path.join(folder, 'composer.json');
  if (fs.existsSync(composerPath)) {
    const isAvail = Boolean(toolAvailability['composer']);
    const commands: ProjectCommand[] = [
      {
        id: 'composer-install',
        label: 'composer install',
        commandText: 'composer install',
        tool: 'composer',
        args: ['install'],
        cwd: folder,
        category: 'install',
        isPrimary: true,
      },
      {
        id: 'composer-update',
        label: 'composer update',
        commandText: 'composer update',
        tool: 'composer',
        args: ['update'],
        cwd: folder,
        category: 'install',
      },
      {
        id: 'composer-dump-autoload',
        label: 'composer dump-autoload',
        commandText: 'composer dump-autoload',
        tool: 'composer',
        args: ['dump-autoload'],
        cwd: folder,
        category: 'install',
      },
    ];

    try {
      const compJson = JSON.parse(fs.readFileSync(composerPath, 'utf8'));
      if (compJson.scripts) {
        for (const [sName] of Object.entries(compJson.scripts)) {
          commands.push({
            id: `composer-script-${sName}`,
            label: `composer run ${sName}`,
            commandText: `composer run ${sName}`,
            tool: 'composer',
            args: ['run', sName],
            cwd: folder,
            category: 'script',
          });
        }
      }
    } catch {}

    detected.push({
      type: 'php',
      name: path.basename(folder),
      tool: 'composer',
      toolAvailable: isAvail,
      toolMissingReason: isAvail ? undefined : 'composer not found',
      groups: [
        {
          id: 'composer-group-all',
          title: 'Composer Commands',
          commands,
        },
      ],
    });
  }

  // ===================== 6. RUBY =====================
  const gemfilePath = path.join(folder, 'Gemfile');
  const rakefilePath = path.join(folder, 'Rakefile');
  if (fs.existsSync(gemfilePath) || fs.existsSync(rakefilePath)) {
    const isAvail = Boolean(toolAvailability['bundle'] || toolAvailability['ruby']);
    const commands: ProjectCommand[] = [
      {
        id: 'ruby-bundle-install',
        label: 'bundle install',
        commandText: 'bundle install',
        tool: 'bundle',
        args: ['install'],
        cwd: folder,
        category: 'install',
        isPrimary: true,
      },
    ];

    if (fs.existsSync(rakefilePath)) {
      commands.push({
        id: 'ruby-bundle-exec-rake',
        label: 'bundle exec rake',
        commandText: 'bundle exec rake',
        tool: 'bundle',
        args: ['exec', 'rake'],
        cwd: folder,
        category: 'run',
      });
    }

    if (fs.existsSync(path.join(folder, 'config', 'routes.rb'))) {
      commands.push({
        id: 'ruby-rails-server',
        label: 'rails server',
        commandText: 'rails server',
        tool: 'rails',
        args: ['server'],
        cwd: folder,
        category: 'run',
        isLongRunning: true,
      });
      commands.push({
        id: 'ruby-rails-console',
        label: 'rails console',
        commandText: 'rails console',
        tool: 'rails',
        args: ['console'],
        cwd: folder,
        category: 'run',
      });
      commands.push({
        id: 'ruby-rails-db-migrate',
        label: 'rails db:migrate',
        commandText: 'rails db:migrate',
        tool: 'rails',
        args: ['db:migrate'],
        cwd: folder,
        category: 'run',
      });
    }

    detected.push({
      type: 'ruby',
      name: path.basename(folder),
      tool: 'bundle',
      toolAvailable: isAvail,
      toolMissingReason: isAvail ? undefined : 'bundle not found',
      groups: [
        {
          id: 'ruby-group-all',
          title: 'Ruby Commands',
          commands,
        },
      ],
    });
  }

  // ===================== 7. DOCKER =====================
  const composeCandidates = [
    'docker-compose.yml',
    'docker-compose.yaml',
    'compose.yml',
    'compose.yaml',
    'Dockerfile',
  ];
  const foundDocker = composeCandidates.some((f) => fs.existsSync(path.join(folder, f)));

  if (foundDocker) {
    const isAvail = Boolean(toolAvailability['docker']);
    const hasCompose = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'].some((f) =>
      fs.existsSync(path.join(folder, f))
    );

    const commands: ProjectCommand[] = [];

    if (hasCompose) {
      commands.push({
        id: 'docker-compose-up-d',
        label: 'docker compose up -d',
        commandText: 'docker compose up -d',
        tool: 'docker',
        args: ['compose', 'up', '-d'],
        cwd: folder,
        category: 'docker',
        isPrimary: true,
      });
      commands.push({
        id: 'docker-compose-up',
        label: 'docker compose up',
        commandText: 'docker compose up',
        tool: 'docker',
        args: ['compose', 'up'],
        cwd: folder,
        category: 'docker',
        isLongRunning: true,
      });
      commands.push({
        id: 'docker-compose-down',
        label: 'docker compose down',
        commandText: 'docker compose down',
        tool: 'docker',
        args: ['compose', 'down'],
        cwd: folder,
        category: 'docker',
      });
      commands.push({
        id: 'docker-compose-build',
        label: 'docker compose build',
        commandText: 'docker compose build',
        tool: 'docker',
        args: ['compose', 'build'],
        cwd: folder,
        category: 'docker',
      });
      commands.push({
        id: 'docker-compose-logs',
        label: 'docker compose logs -f',
        commandText: 'docker compose logs -f',
        tool: 'docker',
        args: ['compose', 'logs', '-f'],
        cwd: folder,
        category: 'docker',
        isLongRunning: true,
      });
      commands.push({
        id: 'docker-compose-ps',
        label: 'docker compose ps',
        commandText: 'docker compose ps',
        tool: 'docker',
        args: ['compose', 'ps'],
        cwd: folder,
        category: 'docker',
      });
      commands.push({
        id: 'docker-compose-restart',
        label: 'docker compose restart',
        commandText: 'docker compose restart',
        tool: 'docker',
        args: ['compose', 'restart'],
        cwd: folder,
        category: 'docker',
      });
    } else if (fs.existsSync(path.join(folder, 'Dockerfile'))) {
      commands.push({
        id: 'docker-build',
        label: `docker build -t ${path.basename(folder).toLowerCase()} .`,
        commandText: `docker build -t ${path.basename(folder).toLowerCase()} .`,
        tool: 'docker',
        args: ['build', '-t', path.basename(folder).toLowerCase(), '.'],
        cwd: folder,
        category: 'docker',
        isPrimary: true,
      });
    }

    detected.push({
      type: 'docker',
      name: path.basename(folder),
      tool: 'docker',
      toolAvailable: isAvail,
      toolMissingReason: isAvail ? undefined : 'docker not found',
      groups: [
        {
          id: 'docker-group-all',
          title: 'Docker Commands',
          commands,
        },
      ],
    });
  }

  // ===================== 8. GENERIC TASKS (Makefile / just / Taskfile) =====================
  const makefilePath = path.join(folder, 'Makefile');
  const justfilePath = path.join(folder, 'justfile');
  const taskfilePath = path.join(folder, 'Taskfile.yml');

  if (fs.existsSync(makefilePath)) {
    const isAvail = Boolean(toolAvailability['make']);
    const targets: ProjectCommand[] = [];

    try {
      const makeContent = fs.readFileSync(makefilePath, 'utf8');
      const lines = makeContent.split(/\r?\n/);
      for (const line of lines) {
        // Target format: "target_name:" at beginning of line
        const match = line.match(/^([a-zA-Z0-9_\-]+)\s*:/);
        if (match && match[1] && !match[1].startsWith('.')) {
          const tName = match[1];
          targets.push({
            id: `make-${tName}`,
            label: `make ${tName}`,
            commandText: `make ${tName}`,
            tool: 'make',
            args: [tName],
            cwd: folder,
            category: 'script',
            isPrimary: targets.length === 0,
          });
          if (targets.length >= 100) break;
        }
      }
    } catch {}

    if (targets.length > 0) {
      detected.push({
        type: 'generic',
        name: 'Makefile',
        tool: 'make',
        toolAvailable: isAvail,
        toolMissingReason: isAvail ? undefined : 'make not found',
        groups: [
          {
            id: 'make-group-targets',
            title: 'Makefile Targets',
            commands: targets,
          },
        ],
      });
    }
  } else if (fs.existsSync(justfilePath)) {
    const isAvail = Boolean(toolAvailability['just']);
    detected.push({
      type: 'generic',
      name: 'justfile',
      tool: 'just',
      toolAvailable: isAvail,
      toolMissingReason: isAvail ? undefined : 'just not found',
      groups: [
        {
          id: 'just-group-targets',
          title: 'Just Tasks',
          commands: [
            {
              id: 'just-default',
              label: 'just',
              commandText: 'just',
              tool: 'just',
              args: [],
              cwd: folder,
              category: 'script',
              isPrimary: true,
            },
          ],
        },
      ],
    });
  } else if (fs.existsSync(taskfilePath)) {
    const isAvail = Boolean(toolAvailability['task']);
    detected.push({
      type: 'generic',
      name: 'Taskfile',
      tool: 'task',
      toolAvailable: isAvail,
      toolMissingReason: isAvail ? undefined : 'task not found',
      groups: [
        {
          id: 'task-group-targets',
          title: 'Taskfile Tasks',
          commands: [
            {
              id: 'task-default',
              label: 'task',
              commandText: 'task',
              tool: 'task',
              args: [],
              cwd: folder,
              category: 'script',
              isPrimary: true,
            },
          ],
        },
      ],
    });
  }

  return detected;
}
