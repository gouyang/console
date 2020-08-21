/* eslint-disable no-await-in-loop, no-console */
import { browser, ExpectedConditions as until } from 'protractor';
import { waitForStringNotInElement } from '@console/shared/src/test-utils/utils';
import { detailViewAction, listViewAction } from '@console/shared/src/test-utils/actions.view';
import { VirtualMachineModel } from '@console/kubevirt-plugin/src/models';
import * as vmView from '../../views/virtualMachine.view';
import {
  VM_MIGRATION_TIMEOUT_SECS,
  VM_ACTION,
  TAB,
  VM_STATUS,
  PAGE_LOAD_TIMEOUT_SECS,
} from '../utils/consts';
import { BaseVirtualMachine } from './baseVirtualMachine';
import { isLoaded, resourceTitle } from '@console/internal-integration-tests/views/crud.view';

const noConfirmDialogActions: VM_ACTION[] = [VM_ACTION.Start, VM_ACTION.Clone];

export class VirtualMachine extends BaseVirtualMachine {
  constructor(config) {
    super({ ...config, model: VirtualMachineModel });
  }

  async action(action: VM_ACTION, waitForAction = true, timeout?: number) {
    await this.navigateToTab(TAB.Details);
    await isLoaded();

    await detailViewAction(action, !noConfirmDialogActions.includes(action));
    if (waitForAction) {
      await this.waitForActionFinished(action, timeout);
    }
  }

  async listViewAction(action: VM_ACTION, waitForAction = true, timeout?: number) {
    await this.navigateToListView();
    await isLoaded();

    await listViewAction(this.name)(action, !noConfirmDialogActions.includes(action));
    if (waitForAction) {
      await this.waitForActionFinished(action, timeout);
    }
  }

  async waitForMigrationComplete(fromNode: string, timeout: number) {
    await this.waitForStatus(VM_STATUS.Running, VM_MIGRATION_TIMEOUT_SECS);
    await browser.refresh(); // Force refresh to update the node value
    await browser.wait(until.visibilityOf(resourceTitle), PAGE_LOAD_TIMEOUT_SECS);
    await browser.wait(
      waitForStringNotInElement(vmView.vmDetailNode(this.namespace, this.name), fromNode),
      timeout,
    );
  }
}
