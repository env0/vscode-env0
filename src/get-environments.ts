import axios, { AxiosResponse } from "axios";
import * as vscode from "vscode";
import { getApiKeyCredentials } from "./auth";
import { ENV0_BASE_URL} from './extension';

const DOT_GIT_SUFFIX_LENGTH = 4;

export type EnvironmentModel = {
	id: string;
	name: string;
	status: string;
	updatedAt: string;
	projectId: string;
	latestDeploymentLog: {
		id: string;
		blueprintRepository: string;
		blueprintRevision: string;
		error?: {
			message?: string;
		}
	};
}; // TODO: change to real Environment Model

export async function getEnvironmentsForBranch() {
	const apiKeyCredentials = getApiKeyCredentials();

	let environments: EnvironmentModel[] = [];

	const organizationId = await getOrganizationId(apiKeyCredentials);

	if (organizationId) {
		environments = await getEnvironments(apiKeyCredentials, organizationId);
	}

	console.log(JSON.stringify(environments));
	if (environments.length > 0) {
		const { currentBranch, repository } = getGitData();
		environments = environments.filter(
			(environment) =>
				environment?.latestDeploymentLog?.blueprintRepository === repository &&
				environment?.latestDeploymentLog?.blueprintRevision === currentBranch
		).filter(environment => environment.status !== "INACTIVE");
	}

	return environments;
}

async function getEnvironments(
	apiKeyCredentials: { username: string, password: string },
	organizationId: string
) {
	let environments: EnvironmentModel[] = [];

	try {
		const environments = (
			await axios.get<EnvironmentModel[]>(
				`https://${ENV0_BASE_URL}/environments`,
				{
					params: { organizationId: organizationId },
					auth: apiKeyCredentials
				}
			)
		).data;

		return environments;
	} catch (e) {
		console.log(e);
	}

	return [];
}

async function getOrganizationId(apiKeyCredentials: { username: string, password: string },) {
	try {
		const organizationId = (
			await axios.get<{ id: string }[]>(
				`https://${ENV0_BASE_URL}/organizations`,
				{
					auth: apiKeyCredentials
				}
			)
		).data[0]?.id;

		return organizationId;
	} catch (error) {
		console.log(error);
	}
}

function getGitData() {
	const extensions = vscode.extensions;
	let normalizedRepositoryName;
	let currentBranch;

	if (extensions) {
		const gitExtension = extensions.getExtension("vscode.git")?.exports;

		const api = gitExtension.getAPI(1);
		const repository = api.repositories[0];

		if (repository) {
			const head = repository.state.HEAD;
			currentBranch = head.name;
			const repositoryName = repository.repository.remotes[0].fetchUrl;
			normalizedRepositoryName = repositoryName.endsWith('.git') ? repositoryName?.slice(
				0,
				-DOT_GIT_SUFFIX_LENGTH
			) : repositoryName;
		}
	}

	return { repository: normalizedRepositoryName, currentBranch };
}
c