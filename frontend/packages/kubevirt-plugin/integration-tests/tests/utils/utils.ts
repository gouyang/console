/* eslint-disable no-await-in-loop */
import { execSync } from 'child_process';
import * as _ from 'lodash';
import { $, $$, browser, by, ExpectedConditions as until } from 'protractor';
import { testName, appHost } from '@console/internal-integration-tests/protractor.conf';
import { safeLoad } from 'js-yaml';
import {
  isLoaded,
  createYAMLButton,
  rowForName,
  createItemButton,
  createYAMLLink,
  resourceTitle,
} from '@console/internal-integration-tests/views/crud.view';
import { click } from '@console/shared/src/test-utils/utils';
import {
  isLoaded as yamlPageIsLoaded,
  saveButton,
  getEditorContent,
} from '@console/internal-integration-tests/views/yaml.view';
import { STORAGE_CLASS, PAGE_LOAD_TIMEOUT_SECS, SEC } from './constants/common';
import { NodePortService, Status } from '../types/types';
import { filterCount } from '../../views/vms.list.view';
import { diskVolumeMode, diskAccessMode } from './constants/vm';
import { MatchLabels } from '@console/internal/module/k8s';

export async function setCheckboxState(elem: any, targetState: boolean) {
  const checkboxState = await elem.isSelected();
  if (checkboxState !== targetState) {
    await click(elem);
  }
}

export async function createProject(name: string) {
  // Use projects if OpenShift so non-admin users can run tests.
  const resource = browser.params.openshift === 'true' ? 'projects' : 'namespaces';
  await browser.get(`${appHost}/k8s/cluster/${resource}`);
  await isLoaded();
  const exists = await rowForName(name).isPresent();
  if (!exists) {
    await createYAMLButton.click();
    await browser.wait(until.presenceOf($('.modal-body__field')));
    await $$('.modal-body__field')
      .get(0)
      .$('input')
      .sendKeys(name);
    await $$('.modal-body__field')
      .get(1)
      .$('input')
      .sendKeys(`test-name=${name}`);
    await $('.modal-content')
      .$('#confirm-action')
      .click();
    await browser.wait(until.urlContains(`/${name}`), PAGE_LOAD_TIMEOUT_SECS);
  }
}

export async function createExampleVMViaYAML(getVMObj?: boolean) {
  let vm = null;
  await browser.get(`${appHost}/k8s/ns/${testName}/virtualization`);
  await isLoaded();
  await click(createItemButton);
  await click(createYAMLLink);
  await yamlPageIsLoaded();
  if (getVMObj) {
    try {
      vm = safeLoad(await getEditorContent());
    } catch {
      return null;
    }
  }
  await click(saveButton);
  await browser.wait(until.presenceOf(resourceTitle));
  return vm;
}

export async function getInputValue(elem: any) {
  return elem.getAttribute('value');
}

export async function getSelectedOptionText(selector: any) {
  return selector.$('option:checked').getText();
}

export async function selectOptionByText(selector: any, option: string) {
  await click(selector.all(by.cssContainingText('option', option)).first());
}

export async function selectOptionByOptionValue(selector: any, option: string) {
  await click(selector.all(by.css(`option[value="${option}"]`)).first());
}

export async function getSelectOptions(selector: any): Promise<string[]> {
  const options = [];
  await selector.$$('option').each((elem) => {
    elem
      .getText()
      .then((text) => options.push(text))
      .catch((err) => Promise.reject(err));
  });
  if (options.length > 0) {
    if (options[0].startsWith('---') || options[0].startsWith('Please select')) {
      return options.slice(1);
    }
  }
  return options;
}

export function getRandStr(length: number) {
  return Math.random()
    .toString(36)
    .replace(/[.]/g, '')
    .substr(1, length); // First char is always 0
}

export function getRandomMacAddress() {
  const getRandByte = () => {
    let byte: string;
    do {
      byte = Math.random()
        .toString(16)
        .substr(2, 2);
    } while (byte.length !== 2);
    return byte;
  };
  return `30:24:${getRandByte()}:${getRandByte()}:${getRandByte()}:${getRandByte()}`;
}

export function getResourceObject(name: string, namespace: string, kind: string) {
  const resourceJson = execSync(`kubectl get -o json -n ${namespace} ${kind} ${name}`).toString();
  return JSON.parse(resourceJson);
}

export function exposeServices(services: Set<any>) {
  const servicesArray: NodePortService[] = [...services];
  servicesArray.forEach(({ name, kind, port, targetPort, exposeName, type, namespace }) => {
    execSync(
      `virtctl expose ${kind} ${name} --port=${port} --target-port=${targetPort} --name=${exposeName} --type=${type} -n ${namespace}`,
    );
  });
}

export function resolveStorageDataAttribute(configMap: any, attribute: string): string {
  const storageClassAttributePath = ['data', `${STORAGE_CLASS}.${attribute}`];
  if (_.has(configMap, storageClassAttributePath)) {
    return _.get(configMap, storageClassAttributePath);
  }
  return _.get(configMap, ['data', attribute]);
}

export const waitForFilterCount = (status: Status, targetCount: number) => {
  return async () => {
    const count = await filterCount(status);
    return count === targetCount;
  };
};

export const waitFor = async (element, text, count = 1) => {
  let sequenceNumber = 0;
  while (sequenceNumber !== count) {
    await browser.wait(until.visibilityOf(element));
    const elemText = await element.getText();
    if (elemText.includes(text)) {
      sequenceNumber += 1;
    } else {
      sequenceNumber = 0;
    }
    await browser.sleep(5 * SEC);
  }
};

export function pauseVM(name: string, namespace: string): void {
  execSync(`virtctl pause vmi ${name} -n ${namespace}`);
}

export const enabledAsBoolean = (enabledStr: string): boolean => {
  return enabledStr === 'Enabled' || false;
};

export const selectNonDefaultAccessMode = (defaultAccessMode) => {
  const accessModeKeys = _.keys(diskAccessMode);
  accessModeKeys.filter((k) => k !== defaultAccessMode);
  return diskAccessMode[accessModeKeys[0]];
};

export const selectNonDefaultVolumeMode = (defaultVolumeMode) => {
  const volumeModeKeys = _.keys(diskVolumeMode);
  volumeModeKeys.filter((k) => k !== defaultVolumeMode);
  return diskVolumeMode[volumeModeKeys[0]];
};

export function getResourceUID(kind: string, name: string, namespace: string): string {
  return execSync(
    `kubectl get --ignore-not-found ${kind} ${name} -n ${namespace} -o jsonpath='{.metadata.uid}'`,
  ).toString();
}

export const getDataVolumeByPrefix = (prefix: string) => {
  const dvs = JSON.parse(execSync(`kubectl get dv -n ${testName} -ojson | jq '.items'`).toString());
  return _.find(dvs, (dv) => dv.metadata.name.includes(prefix));
};

/*
 * Function recursively freezes objects including inner objects
 * Source: https://github.com/substack/deep-freeze/
 */
export function deepFreeze(o: {}) {
  Object.freeze(o);
  Object.getOwnPropertyNames(o).forEach(function(prop) {
    if (
      o.hasOwnProperty(prop) &&
      o[prop] !== null &&
      (typeof o[prop] === 'object' || typeof o[prop] === 'function') &&
      !Object.isFrozen(o[prop])
    ) {
      deepFreeze(o[prop]);
    }
  });
  return o;
}

export function getNodes() {
  const nodes = execSync(`kubectl get node -l cpumanager=true | awk 'NR>1{print $1}'`)
    .toString()
    .trim();
  return nodes.split('\n');
}

export function labelNode(node: string, labels: MatchLabels, add?: boolean) {
  if (add) {
    for (const [key, value] of Object.entries(labels)) {
      execSync(`kubectl label --overwrite=true nodes ${node} ${key}=${value}`);
    }
  } else {
    for (const key of Object.keys(labels)) {
      execSync(`kubectl label nodes ${node} ${key}-`);
    }
  }
}

export function taintNode(node: string, labels: MatchLabels, effect: string, add?: boolean) {
  if (add) {
    for (const [key, value] of Object.entries(labels)) {
      execSync(`kubectl taint --overwrite=true nodes ${node} ${key}=${value}:${effect}`);
    }
  } else {
    for (const key of Object.keys(labels)) {
      execSync(`kubectl taint nodes ${node} ${key}:${effect}-`);
    }
  }
}
