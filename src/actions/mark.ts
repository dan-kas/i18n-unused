import { writeFileSync } from 'fs';

import { createRequire } from 'module';

import { RunOptions, UnusedTranslations } from '../types';

import { initialize } from '../core/initialize';
import { collectUnusedTranslations } from '../core/translations';
import { generateFilesPaths } from '../helpers/files';
import { applyToFlatKey } from '../core/action';
import { checkUncommittedChanges } from '../helpers/git';

import { GREEN } from '../helpers/consoleColor';

export const markUnusedTranslations = async (
  options: RunOptions,
): Promise<UnusedTranslations> => {
  const config = await initialize(options);

  const localesFilesPaths = await generateFilesPaths(config.localesPath, {
    srcExtensions: ['json'], // @TODO implement other types when add other types writes
    recursiveSearch: config.localesPathSubdirectories,
    ignorePaths: config.ignorePaths,
  });

  const srcFilesPaths = await generateFilesPaths(
    `${process.cwd()}/${config.srcPath}`,
    {
      srcExtensions: config.srcExtensions,
      ignorePaths: config.ignorePaths,
      basePath: config.srcPath,
    },
  );

  const unusedTranslations = await collectUnusedTranslations(
    localesFilesPaths,
    srcFilesPaths,
    {
      context: config.context,
      contextSeparator: config.translationContextSeparator,
      ignoreComments: config.ignoreComments,
      localeFileParser: config.localeFileParser,
      excludeTranslationKey: config.excludeKey,
    },
  );

  if (config.gitCheck) {
    checkUncommittedChanges();
  }

  unusedTranslations.translations.forEach((translation) => {
    const r = createRequire(import.meta.url);
    const locale = r(translation.localePath);

    translation.keys.forEach((key) =>
      applyToFlatKey(
        locale,
        key,
        (source, lastKey) => {
          source[lastKey] = `${config.marker} ${source[lastKey]}`;
        },
        {
          flatTranslations: config.flatTranslations,
          separator: config.translationSeparator,
        },
      ),
    );

    writeFileSync(translation.localePath, JSON.stringify(locale, null, 2));

    console.log(GREEN, `Successfully marked: ${translation.localePath}`);
  });

  return unusedTranslations;
};
