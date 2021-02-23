import { testName } from '../../support';
import {
  switchPerspective,
  Perspective,
  addHeader,
  topologyHeader,
} from '../../view/dev-perspective';
import { DEFAULTS_VALUES, VM_ACTION, VM_ACTION_TIMEOUT, VM_STATUS } from '../../const/index';
import { detailViewAction, modalTitle, selectDropdownItem } from '../../view/actions';
import { waitForStatus, detailsTab } from '../../view/vm';
import { alertTitle, confirmCloneButton } from '../../view/clone';
import { ProvisionSource } from '../../enums/provisionSource';

const TEMPLATE_BASE_IMAGE = Cypress.env('TEMPLATE_BASE_IMAGE');
const TEMPLATE_NAME = Cypress.env('TEMPLATE_NAME');
const IMAGE = Cypress.env('UPLOAD_IMG');
const OS_IMAGE_NS = Cypress.env('DOWNSTREAM')
  ? 'openshift-virtualization-os-images'
  : 'kubevirt-os-images';
const vmName = `test-devconsole-${testName}`;

describe('test dev console', () => {
  before(() => {
    cy.login();
    cy.visit('/');
    cy.createProject(testName);
    cy.exec(`test -f ${IMAGE} || curl --fail ${ProvisionSource.URL.getSource()} -o ${IMAGE}`);
    cy.deleteResource({
      kind: 'DataVolume',
      metadata: {
        name: TEMPLATE_BASE_IMAGE,
        namespace: OS_IMAGE_NS,
      },
    });
    cy.uploadOSImage(TEMPLATE_BASE_IMAGE, OS_IMAGE_NS, IMAGE, '1');
  });

  after(() => {
    cy.deleteResource({
      kind: 'DataVolume',
      metadata: {
        name: TEMPLATE_BASE_IMAGE,
        namespace: OS_IMAGE_NS,
      },
    });
    cy.deleteResource({
      kind: 'VirtualMachine',
      metadata: {
        name: vmName,
        namespace: testName,
      },
    });
    cy.deleteResource({
      kind: 'VirtualMachine',
      metadata: {
        name: `${vmName}-clone`,
        namespace: testName,
      },
    });
  });

  describe('switch perspective', () => {
    it('switch from admin to dev perspective', () => {
      switchPerspective(Perspective.Developer);
      cy.byLegacyTestID(addHeader).should('exist');
      cy.byLegacyTestID(topologyHeader).should('exist');
    });
  });

  describe('create vm in dev console', () => {
    it('ID(CNV-5699) create virtual machine', () => {
      cy.byLegacyTestID(addHeader).click();
      cy.contains('Quick Starts').should('be.visible');
      cy.contains('Virtual Machines')
        .should('be.visible')
        .click();
      cy.contains(TEMPLATE_NAME)
        .should('be.visible')
        .click();
      cy.contains('Create from template').click({ force: true });
      cy.get('input[id="vm-name"]')
        .clear()
        .type(vmName);
      cy.get('button[type="submit"]').click();
    });
  });

  describe('review vm tabs', () => {
    it('ID(CNV-5700) review details tab', () => {
      cy.byLegacyTestID(topologyHeader).click();
      // first click moves on to the VM icon
      cy.byLegacyTestID('base-node-handler').click();
      // second click opens the vm details
      cy.byLegacyTestID('base-node-handler').click();

      waitForStatus(VM_STATUS.Running, VM_ACTION_TIMEOUT.VM_IMPORT_AND_BOOTUP);

      cy.get(detailsTab.vmPod).should('not.contain', DEFAULTS_VALUES.NOT_AVAILABLE);
      cy.get(detailsTab.vmIP).should('not.contain', DEFAULTS_VALUES.NOT_AVAILABLE);
      cy.get(detailsTab.vmNode).should('not.contain', DEFAULTS_VALUES.NOT_AVAILABLE);
      cy.get(detailsTab.vmTemplate).should('contain', TEMPLATE_BASE_IMAGE);
    });

    it('ID(CNV-5701) review resources tab', () => {
      // navigate to resource tab
      cy.get('button[type="button"]')
        .contains('Resources')
        .click();

      // check pod status is running in this tab
      cy.get(detailsTab.vmStatus).should('contain', VM_STATUS.Running);
    });
  });

  describe('vm actions in devconsole', () => {
    beforeEach(() => {
      cy.byLegacyTestID(topologyHeader).click();
      cy.byLegacyTestID('base-node-handler').click();
    });

    it('ID(CNV-5702) restart vm', () => {
      waitForStatus(VM_STATUS.Running, VM_ACTION_TIMEOUT.VM_IMPORT_AND_BOOTUP);

      detailViewAction(VM_ACTION.Restart);
      waitForStatus(VM_STATUS.Starting, VM_ACTION_TIMEOUT.VM_BOOTUP);
      waitForStatus(VM_STATUS.Running, VM_ACTION_TIMEOUT.VM_BOOTUP);
    });

    it('ID(CNV-5702) stop vm', () => {
      detailViewAction(VM_ACTION.Stop);
      waitForStatus(VM_STATUS.Off, VM_ACTION_TIMEOUT.VM_BOOTUP);
    });

    it('ID(CNV-5702) start vm', () => {
      detailViewAction(VM_ACTION.Start);
      waitForStatus(VM_STATUS.Running, VM_ACTION_TIMEOUT.VM_BOOTUP);
    });

    it('ID(CNV-5702) migrate vm', () => {
      detailViewAction(VM_ACTION.Migrate);
      waitForStatus(VM_STATUS.Migrating, VM_ACTION_TIMEOUT.VM_BOOTUP);
      waitForStatus(VM_STATUS.Running, VM_ACTION_TIMEOUT.VM_BOOTUP);
    });

    it('ID(CNV-5702) clone vm', () => {
      selectDropdownItem(VM_ACTION.Clone);
      cy.get(modalTitle)
        .contains('Clone Virtual Machine')
        .should('exist');
      cy.get(alertTitle).should('be.visible');
      cy.get(confirmCloneButton).click();

      // delete origin VM
      waitForStatus(VM_STATUS.Off, VM_ACTION_TIMEOUT.VM_BOOTUP);
      detailViewAction(VM_ACTION.Delete);
    });

    // delete cloned vm
    it('ID(CNV-5702) delete vm', () => {
      detailViewAction(VM_ACTION.Delete);
      cy.get('.co-hint-block__title')
        .should('be.visible')
        .contains('No resources found');
    });
  });
});
