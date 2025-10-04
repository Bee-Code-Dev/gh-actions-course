const core = require("@actions/core");
const { exec, getExecOutput } = require("@actions/exec");
const github = require("@actions/github");

const validateBranchName = ({ branchName }) => /^[a-zA-Z0-9-_\.\/]+$/.test(branchName);
const valdiateDirectoryName = ({ directoryName }) => /^[a-zA-Z0-9-_\-\/]+$/.test(directoryName);
const setupLogger = ({ debug, prefix } = {debug: false, prefix: ''}) => ({
  debug: (msg) => {
    if (debug) {
      core.info(`DEBUG: ${prefix} ${prefix ? ':' : ''}${msg}`);
    }
  },
  error: (msg) => {
    core.error(`${prefix} ${prefix ? ':' : ''}${msg}`);
  },
  info: (msg) => {
    core.info(`INFO: ${prefix} ${prefix ? ':' : ''}${msg}`);
  }
})

async function run() {
  /**
   * Parse inputs: base-branch from which to check for updates
   * head branch to use to create the PR
   */
  const baseBranch = core.getInput("base-branch", { required: true });
  const headBranch = core.getInput("head-branch", { required: true });
  const workingDirectory = core.getInput("working-directory", { required: true });
  const ghToken = core.getInput("gh-token", { required: true });
  const debug = core.getBooleanInput("debug");
  const logger = setupLogger({ debug, prefix: '[js-dependency-update]' });

  const commonExcecOptions = {
    cwd: workingDirectory
  }
  const gitHubSetup = async () => {
    await exec(`git config --global user.name "gh-automation"`);
    await exec(`git config --global user.email "gh-automation@email.com"`);
  }

  logger.debug('Validating inputs...');
  logger.debug(`Inputs: baseBranch=${baseBranch}, headBranch=${headBranch}, workingDirectory=${workingDirectory}, debug=${debug}`);
  if(!validateBranchName({ branchName: baseBranch })) {
    core.setFailed(`Invalid base-branch name: ${baseBranch}`);
    return;
  }
  if(!validateBranchName({ branchName: headBranch })) {
    core.setFailed(`Invalid head-branch name: ${headBranch}`);
    return;
  }
  if(!valdiateDirectoryName({ directoryName: workingDirectory })) {
    core.setFailed(`Invalid working directory name: ${workingDirectory}`);
    return;
  }
  logger.debug(`Base branch: ${baseBranch}`);
  logger.debug(`Head branch: ${headBranch}`);
  logger.debug(`Working directory: ${workingDirectory}`);

  logger.debug('Checking for package updates...');
  await exec(`npm update`, [], { ...commonExcecOptions });

  const gitStatus = await getExecOutput(`git status -s package*.json`, [], { ...commonExcecOptions });
  let updatesAvailable = false;
  if (gitStatus.stdout.length > 0) {
    updatesAvailable = true;
    logger.debug(`There are updates available`);
    logger.debug(`Setting up git...`);
    await gitHubSetup();
    logger.debug(`Commiting and pushing changes in package.json and package-lock.json...`);
    await exec(`git checkout -b ${headBranch}`, [], {
      ...commonExcecOptions
    });
    await exec(`git add package.json package-lock.json`, [], { ...commonExcecOptions });
    await exec(`git commit -m "chore: update NPM dependencies"`, [], { ...commonExcecOptions });
    await exec(`git push --set-upstream origin ${headBranch} --force`, [], { ...commonExcecOptions });
    logger.debug(`Fetching octokit API...`);
    const octokit = github.getOctokit(ghToken);
    try {
      logger.debug(`Creating PR...`);
      await octokit.rest.pulls.create({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        title: `Update NPM dependencies`,
        body: `This PR updates the NPM dependencies to their latest versions`,
        base: baseBranch,
        head: headBranch,
      });
      logger.info(`Created PR successfully`);
    } catch (error) {
      logger.error(`Something went wrong creating the PR: ${error.message}`);
      core.setFailed(error.message);
      logger.error(error);
    }
  } else {
    logger.info(`No updates at this point in time`);
  }
  logger.info(`Settings updates-available output to ${updatesAvailable}`);
  core.setOutput('updates-available', updatesAvailable);
}

run();