import { writeFileSync, readFileSync } from 'fs';

import { createRequire } from 'module';

import { RunOptions, UnusedTranslations } from '../types';

import { initialize } from '../core/initialize';
import { collectUnusedTranslations } from '../core/translations';
import { generateFilesPaths } from '../helpers/files';
import { applyToFlatKey } from '../core/action';
import { checkUncommittedChanges } from '../helpers/git';
import { detectJsonIndent } from '../helpers/detect-json-indent';

import { GREEN } from '../helpers/consoleColor';

export const removeUnusedTranslations = async (
  options: RunOptions,
): Promise<UnusedTranslations> => {
  const config = await initialize(options);

  const localesFilesPaths = await generateFilesPaths(config.localesPath, {
    srcExtensions: ['json'], // @TODO implement other types when add other types writes
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
          delete source[lastKey];
        },
        {
          flatTranslations: config.flatTranslations,
          separator: config.translationSeparator,
        },
      ),
    );

    const localeFileContent = readFileSync(translation.localePath, 'utf8');
    const localeFileIndent = detectJsonIndent(localeFileContent);

    writeFileSync(
      translation.localePath,
      JSON.stringify(locale, null, localeFileIndent),
    );

    console.log(GREEN, `Successfully removed: ${translation.localePath}`);
  });

  return unusedTranslations;
};
