const core = require("@actions/core");
const { exec } = require("@actions/exec");

const validateBranchName = ({ branchName }) => /^[a-zA-Z0-9-_\.\/]+$/.test(branchName);
const valdiateDirectoryName = ({ directoryName }) => /^[a-zA-Z0-9-_\-\/]+$/.test(directoryName);
async function run() {
  /**
   * Parse inputs: base-branch from which to check for updates
   * target branch to use to create the PR
   */
  const baseBranch = core.getInput("base-branch");
  const targetBranch = core.getInput("target-branch");
  const workingDirectory = core.getInput("working-directory");
  const ghToken = core.getInput("gh-token");
  const debug = core.getInput("debug");

  if(!validateBranchName({ branchName: baseBranch })) {
    core.setFailed(`Invalid base branch name: ${baseBranch}`);
    return;
  }
  if(!validateBranchName({ branchName: targetBranch })) {
    core.setFailed(`Invalid base branch name: ${targetBranch}`);
    return;
  }
  if(!valdiateDirectoryName({ directoryName: workingDirectory })) {
    core.setFailed(`Invalid working directory name: ${workingDirectory}`);
    return;
  }
  core.info(`[js-dependency-update]: Base branch: ${baseBranch}`);
  core.info(`[js-dependency-update]: Target branch: ${targetBranch}`);
  core.info(`[js-dependency-update]: Working directory: ${workingDirectory}`);

  await exec(`npm update`, [], { cwd: workingDirectory });

  const gitStatus = await exec.getExecOutput(`git status -s package*.json`, [], { cwd: workingDirectory });
  if (gitStatus.stdout.length > 0) {
    core.info(`[js-dependency-update]: There are updates available`);
  } else {
    core.info(`[js-dependency-update]: No updates to commit`);
  }

}

run();