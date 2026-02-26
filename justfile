px := "pnpm exec"
extension_name := `jq '.name' package.json`

copy-wasm-to-dist:
    tsx ./script/copy-assets.ts dist

list-all-testcase:
    {{ px }} vitest list | fzf

test-unit-all:
    {{ px }} vitest --config vitest.config.mts --bail 1 --run

test-unit file='' name='' timeout='0':
    {{ px }} vitest run {{ file }} -t "{{ name }}" --testTimeout={{ timeout }} --hideSkippedTests

test-integration:
    pnpm run pretest
    tsx ./script/copy-assets.ts out/lib
    node out/test/runTest.js

# e.g. just test-integration-w-file 'generate-all.test.js'
test-integration-w-file file='':
    pnpm run pretest
    tsx ./script/copy-assets.ts out/lib
    TEST_FILE_PATTERN="**/{{ file }}" node out/test/runTest.js

test-integration-w-coverage:
    pnpm run pretest
    tsx ./script/copy-assets.ts out/lib
    {{ px }} c8 --include out --exclude out/test node out/test/runTest.js

prepare version:
    git checkout -b "release/v{{ version }}"
    echo "Updating package.json to {{ version }}..."
    jq ".version = \"{{ version }}\"" package.json > package.json.tmp && mv package.json.tmp package.json
    git add package.json
    git commit -m "chore: bump version to {{ version }}"
    git push origin "release/v{{ version }}"

test-release version:
    vsce package --no-dependencies -o {{ extension_name }}-v{{ version }}.vsix

release version:
    git tag -a "v{{ version }}" -m "Release v{{ version }}"
    git push origin "v{{ version }}"
    gh release create v{{ version }} ./{{ extension_name }}-v{{ version }}.vsix --generate-notes
    vsce publish --no-dependencies {{ version }}
