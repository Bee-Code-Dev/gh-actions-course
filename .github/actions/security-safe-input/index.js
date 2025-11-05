const core = require("@actions/core");

async function run() {
  try {
    const prTitle = core.getInput("pr-title");
    if (prTitle.startsWith("feat")) {
      core.info("PR is feature");
    } else {
      core.setFailed("PR is not feature");
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}