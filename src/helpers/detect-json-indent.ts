export const detectJsonIndent = (jsonContent: string): number => {
  if (jsonContent === '{}') {
    return 4;
  }

  const lines = jsonContent.split('\n');

  if (lines.length < 2) {
    return 0;
  }

  return lines[1].match(/^(\s*)/)[0]?.length ?? 4;
};
