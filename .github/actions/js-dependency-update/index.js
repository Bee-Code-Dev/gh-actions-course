const core = require("@actions/core");
const { exec, getExecOutput } = require("@actions/exec");
const github = require("@actions/github");

const validateBranchName = ({ branchName }) => /^[a-zA-Z0-9-_\.\/]+$/.test(branchName);
const valdiateDirectoryName = ({ directoryName }) => /^[a-zA-Z0-9-_\-\/]+$/.test(directoryName);
async function run() {
  /**
   * Parse inputs: base-branch from which to check for updates
   * target branch to use to create the PR
   */
  const baseBranch = core.getInput("base-branch", { required: true });
  const targetBranch = core.getInput("target-branch", { required: true });
  const workingDirectory = core.getInput("working-directory", { required: true });
  const ghToken = core.getInput("gh-token", { required: true });
  const debug = core.getInput("debug");
  const commonExcecOptions = {
    cwd: workingDirectory
  }

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

  await exec(`npm update`, [], { ...commonExcecOptions });

  const gitStatus = await getExecOutput(`git status -s package*.json`, [], { ...commonExcecOptions });
  if (gitStatus.stdout.length > 0) {
    core.info(`[js-dependency-update]: There are updates available`);
    await exec(`git config --global user.name "gh-automation"`);
    await exec(`git config --global user.email "gh-automation@email.com"`);
    await exec(`git checkout -b ${targetBranch}`, [], {
      ...commonExcecOptions
    });
    await exec(`git add package.json package-lock.json`, [], { ...commonExcecOptions });
    await exec(`git commit -m "chore: update js dependencies"`, [], { ...commonExcecOptions });
    await exec(`git push --set-upstream origin ${targetBranch} --force`, [], { ...commonExcecOptions });
    const octokit = github.getOctokit(ghToken);
    try {
      await octokit.rest.pulls.create({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        title: `Update NPM dependencies`,
        body: `This PR updates the NPM dependencies to their latest versions`,
        base: baseBranch,
        head: targetBranch,
      });
    } catch (error) {
      core.error(`[js-dependency-update]: Could not create PR, it might already exist`);
      core.setFailed(error.message);
      core.error(error);
    }
    core.info(`[js-dependency-update]: Created PR successfully`);
  } else {
    core.info(`[js-dependency-update]: No updates to commit`);
  }

}

run();