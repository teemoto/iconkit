import {
  lstat,
  mkdir,
  readdir,
  writeFile,
  rename,
  link,
  unlink,
  realpath,
} from 'node:fs/promises';
import { resolve, parse, join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { planOutputWrite } from '@icon-kit/core';

async function stat(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

async function inspectPath(path, directory = false) {
  const absolute = resolve(path);
  let current = parse(absolute).root;
  const parts = absolute.slice(current.length).split('/').filter(Boolean);
  for (const [index, part] of parts.entries()) {
    const parent = await stat(current);
    if (parent) {
      const names = await readdir(current);
      const collision = names.find(
        (name) => name.toLowerCase() === part.toLowerCase() && name !== part,
      );
      if (collision)
        throw new Error(
          `Output path has a case collision: ${join(current, collision)}`,
        );
    }
    current = join(current, part);
    const entry = await stat(current);
    if (entry?.isSymbolicLink())
      throw new Error(`Refusing to write through a symbolic link: ${current}`);
    if (
      entry &&
      (directory || index < parts.length - 1) &&
      !entry.isDirectory()
    )
      throw new Error(`Output parent is not a directory: ${current}`);
    if (entry && !directory && index === parts.length - 1 && !entry.isFile())
      throw new Error(`Output destination is not a regular file: ${current}`);
  }
  return stat(absolute);
}

/** Preflights every destination before writing; replaces individual files atomically. */
export async function writeOutput(
  root,
  files,
  overwrite = false,
  protectedPaths = [],
) {
  root = resolve(root);
  if ((await stat(root))?.isSymbolicLink())
    throw new Error(`Refusing a symbolic-link output directory: ${root}`);
  // Resolve host aliases such as macOS /var before inspecting paths inside the destination.
  const missing = [];
  let ancestor = root;
  while (!(await stat(ancestor))) {
    missing.unshift(ancestor.slice(dirname(ancestor).length + 1));
    ancestor = dirname(ancestor);
  }
  root = join(await realpath(ancestor), ...missing);
  protectedPaths = await Promise.all(
    protectedPaths.map((path) => realpath(path).catch(() => resolve(path))),
  );
  await inspectPath(root, true);
  const existingPaths = [];
  for (const file of files) {
    const checked = planOutputWrite([file]);
    if (!checked.valid) throw new Error(checked.diagnostics[0].message);
    const destination = resolve(root, file.path);
    if (protectedPaths.some((path) => resolve(path) === destination))
      throw new Error(`Output would replace an input file: ${destination}`);
    if (await inspectPath(destination)) existingPaths.push(file.path);
  }
  const plan = planOutputWrite(files, { overwrite, existingPaths });
  if (!plan.valid)
    throw new Error(
      `${plan.diagnostics[0].message} ${plan.diagnostics[0].suggestion}`,
    );
  const staged = [];
  try {
    for (const file of files) {
      const destination = resolve(root, file.path);
      await mkdir(dirname(destination), { recursive: true });
      await inspectPath(dirname(destination), true);
      const temporary = join(
        dirname(destination),
        `.iconkit-${randomUUID()}.tmp`,
      );
      await writeFile(temporary, file.bytes, { flag: 'wx' });
      staged.push({ temporary, destination });
    }
    for (const { temporary, destination } of staged) {
      await inspectPath(destination);
      if (overwrite) await rename(temporary, destination);
      else {
        await link(temporary, destination);
        await unlink(temporary);
      }
    }
  } finally {
    for (const { temporary } of staged)
      await unlink(temporary).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
  }
}
