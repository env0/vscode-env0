
import axios, { AxiosResponse } from 'axios';
import * as vscode from 'vscode';

const ENV0_BASE_URL = 'api-dev.dev.env0.com'
type Environment = { id: string, latestDeploymentLog: { blueprintRepository: string, blueprintRevision: string } }; // TODO: change to real Environment Model

export async function getEnvironmentsForBranch() {
	// get env0 api key & secret 
	const API_KEY = "";
	const API_SECRET = ""
	let environments: Environment[] = [];

	const organizationId = await getOrganizationId(API_KEY, API_SECRET);

	if (organizationId) {
		environments = await getEnvironments(API_KEY, API_SECRET, organizationId);
	}

	if (environments.length > 0) {
		const { currentBranch, repository } = getGitData();
		environments.filter(environment => environment.latestDeploymentLog.blueprintRepository === repository && environment.latestDeploymentLog.blueprintRevision === currentBranch)
	}

	return environments;
}

async function getEnvironments(apiKey: string, apiSecret: string, organizationId: string) {
	let environments: Environment[] = [];

	await axios.get(`https://${ENV0_BASE_URL}/environments`, {
		params: { organizationId: organizationId },
		auth: {
			username: apiKey,
			password: apiSecret
		}
	})
		.then((response: AxiosResponse<Array<Environment>>) => {
			environments = response.data;
		})
		.catch(function (error) {
			// handle error
			console.log(error);
		})

	return environments;
}

async function getOrganizationId(apiKey: string, apiSecret: string) {
	let organizationId;

	await axios.get(`https://${ENV0_BASE_URL}/organizations`, {
		auth: {
			username: apiKey,
			password: apiSecret
		}
	})
		.then((response: AxiosResponse<Array<{ id: string }>>) => {
			organizationId = response.data[0]?.id;
		})
		.catch(function (error) {
			// handle error
			console.log(error);
		})

	return organizationId;
}

function getGitData() {
	const extensions = vscode.extensions;
	let repository;
	let currentBranch;

	if (extensions) {
		const gitExtension = extensions.getExtension('vscode.git')?.exports;

		const api = gitExtension.getAPI(1);
		repository = api.repositories[0];

		if (repository) {
			const head = repository.state.HEAD;
			currentBranch = head.name;
		}

	}

	return { repository, currentBranch }

}

