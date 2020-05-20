const fs = require("fs");

/** Original changelog string content */
const changelog = fs.readFileSync("CHANGELOG.md").toString();
/** Base URL for repository */
const baseUrl = "https://github.com/serverless/serverless-azure-functions/";
/** URL for viewing releases */
const releaseUrl = baseUrl + "releases/tag/"
/** URL for comparing releases, commits or branches */
const compareUrl = baseUrl + "compare/";

/**
 * Groups all commits of the same type within a non-beta version
 * 
 * EXAMPLE:
 * 
 * # 1.0.0-3
 * 
 * ### Features
 * * Feature 1
 * 
 * # 1.0.0-2
 * 
 * ### Bug Fixes
 * * Bug Fix 2
 * 
 * # 1.0.0-1
 * 
 * ### Bug Fixes
 * * Bug Fix 1
 * 
 * OUTPUT:
 * 
 * # 1.0.0
 * 
 * ### Features
 * * Feature 1
 * 
 * ### Bug Fixes
 * * Bug Fix 2
 * * Bug Fix 1
 * 
 * @param {string} changelog String content of changelog file 
 */
function condenseChangelog(changelog) {
  const lines = getLines(changelog);
  const condensed = groupLines(lines);
  return generateMarkdown(condensed);
}

function generateMarkdown(condensed) {
  // Sorted in descending order
  const versions = Object.keys(condensed).sort((a, b) => a < b);

  let result = "";

  for (let i = 0; i < versions.length; i++) {
    const releaseVersion = versions[i];
    /** Markdown header and link to comparison between previous release */
    const header = (i < versions.length - 1)
      ?
      `# [${releaseVersion}](${compareUrl}v${versions[i+1]}...v${releaseVersion})`
      :
      `# [${releaseVersion}](${releaseUrl}v${releaseVersion})`
    result += header;

    const preferredCommitTypes = [ "### Features", "### Bug Fixes" ]

    const commitTypes = Object.keys(condensed[releaseVersion]);

    if (!commitTypes.length) {
      result += "\n\n";
      continue;
    }

    for (const commitType of preferredCommitTypes) {
      result += commitsToMarkdown(commitType, condensed[releaseVersion]);
    }

    for (const commitType of commitTypes.filter((cType) => !preferredCommitTypes.includes(cType))) {
      result += commitsToMarkdown(commitType, condensed[releaseVersion]);
    }
    result += "\n\n"
  } 
  return result;
}

/** Convert list of commits to markdown */
function commitsToMarkdown(commitType, commitTypeMap) {
  return `\n\n${commitType}\n\n` +
    commitTypeMap[commitType].join("\n")
}

/**
 * Returns object containing re-structured changelog
 *  
 * Example Structure:
 * {
 *   "1.0.0": {
 *      "### Bug Fixes": [
 *        "Bug Fix 1",
 *        "Bug Fix 2",
 *        ... 
 *      ],
 *      "### Features": [
 *        "Feature 1",
 *        "Feature 2"
 *      ]
 *   }
 * }
 */
function groupLines(lines) {
  const condensed = {}
  /** Non-beta version */
  let currentVersion = process.argv[2];
  /** Commit type ("### Bug Fixes", "### Features", etc.) */
  let currentCommitTypeHeader = null;

  for (const line of lines) {
    // Version line
    if (line.startsWith("# ")) {
      // Extract non-beta version
      currentVersion = line.match(/([0-9]+\.[0-9]+\.[0-9]+)(-[0-9]+)?/)[1];
      // Instantiate object to contain commit type objects
      if (!condensed[currentVersion]) {
        condensed[currentVersion] = {}
      }
    }
    // Commit type line
    if (line.startsWith("### ")) {
      currentCommitTypeHeader = line;
      if (!condensed[currentVersion]) {
        condensed[currentVersion] = {}
      }

      if (!condensed[currentVersion][currentCommitTypeHeader]) {
          condensed[currentVersion][currentCommitTypeHeader] = [];
      }
    } else if (line.startsWith("*")) {
      // Add commit to appropriate location in condensed changelog
      condensed[currentVersion][currentCommitTypeHeader].push(line);
    }
  }
  return condensed;
}

/** Get all non-empty lines of changelog */
function getLines(changelog) {
  return changelog
    .split("\n")
    .filter((line) => line.trim().length > 0)
}

fs.writeFileSync(
  "CHANGELOG.md",
  condenseChangelog(changelog)
)
