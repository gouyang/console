import { testName } from '@console/internal-integration-tests/protractor.conf';
import { createResource, deleteResource } from '@console/shared/src/test-utils/utils';
import { getVMManifest } from './utils/mocks';
import { VM_STATUS, VM_ACTION, PAGE_LOAD_TIMEOUT_SECS } from './utils/consts';
import { VirtualMachine } from './models/virtualMachine';
import { filterCount } from '../views/vms.list.view';
import { isLoaded } from '@console/internal-integration-tests/views/crud.view';
import { browser } from 'protractor';
import { waitForFilterCount } from './utils/utils';

describe('Test List View Filtering', () => {
  const testVM = getVMManifest('URL', testName);
  const vm = new VirtualMachine(testVM.metadata);

  beforeAll(() => {
    createResource(testVM);
  });

  afterAll(() => {
    deleteResource(testVM);
  });

  it('ID(CNV-3614) Displays correct count of Pending VMs', async () => {
    await vm.action(VM_ACTION.Start, false);
    await vm.navigateToListView();
    await isLoaded();
    await browser.wait(waitForFilterCount(VM_STATUS.Pending, 1), PAGE_LOAD_TIMEOUT_SECS);
    const pendingCount = await filterCount(VM_STATUS.Pending);
    expect(pendingCount).toEqual(1);
    await vm.waitForStatus(VM_STATUS.Running);
  });

  it('ID(CNV-3615) Displays correct count of Off VMs', async () => {
    await vm.action(VM_ACTION.Stop);
    await vm.navigateToListView();
    await isLoaded();
    const offCount = await filterCount(VM_STATUS.Off);
    expect(offCount).toEqual(1);
  });

  it('ID(CNV-3616) Displays correct count of Running VMs', async () => {
    await vm.action(VM_ACTION.Start);
    await vm.navigateToListView();
    await isLoaded();
    const runningCount = await filterCount(VM_STATUS.Running);
    expect(runningCount).toEqual(1);
  });
});
