import { readFile } from 'node:fs/promises';

const tag = process.argv[2];

if (!tag || !/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag)) {
  throw new Error('Provide a release tag such as v0.1.0-alpha.0.');
}

const version = tag.slice(1);
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const [corePackage, cliPackage, changelog] = await Promise.all([
  readJson(new URL('../packages/core/package.json', import.meta.url)),
  readJson(new URL('../packages/cli/package.json', import.meta.url)),
  readFile(new URL('../CHANGELOG.md', import.meta.url), 'utf8'),
]);

if (corePackage.version !== version || cliPackage.version !== version) {
  throw new Error(
    `Release ${tag} does not match core ${corePackage.version} and CLI ${cliPackage.version}.`,
  );
}

if (!changelog.includes(`## ${version} —`)) {
  throw new Error(`CHANGELOG.md has no section for ${version}.`);
}

if (
  process.env.ICONKIT_REQUIRE_TAG === 'true' &&
  process.env.GITHUB_REF !== `refs/tags/${tag}`
) {
  throw new Error(`Publishing requires workflow ref refs/tags/${tag}.`);
}

console.log(`Release metadata verified for ${tag}.`);
