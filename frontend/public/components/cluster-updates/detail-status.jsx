import React from 'react';

import {k8sKinds, k8sPatch} from '../../module/k8s';
import {LoadingInline, OperatorState} from '../utils';
import {SafetyFirst} from '../safety-first';

export class DetailStatus extends SafetyFirst {
  constructor(props) {
    super(props);
    this.state = {
      outdated: false
    };
  }

  componentWillReceiveProps() {
    this.setState({
      outdated: false
    });
  }

  _doAction(kind, field, value) {
    this.setState({
      outdated: true
    });

    let k8skind, resource;
    if (kind === 'config') {
      k8skind = k8sKinds.CHANNELOPERATORCONFIG;
      resource = this.props.config;
    } else if (kind === 'app-version') {
      k8skind = k8sKinds.APPVERSION;
      resource = { metadata: { namespace: 'tectonic-system', name: 'tectonic-cluster' } };
    }

    const patch = [{ op: 'replace', path: `/${field}`, value: value }];
    k8sPatch(k8skind, resource, patch)
      .catch((error) => {
        this.setState({
          outdated: false
        });
        throw error;
      });
  }

  _actionButton() {
    if (this.props.config) {
      if (this.state.outdated) {
        return <button className="co-cluster-updates__action-button btn" disabled={true}><LoadingInline /></button>;
      }

      if (this.props.channelState === 'Paused' || this.props.channelState === 'Pausing') {
        return <button className="co-cluster-updates__action-button btn btn-default" onClick={this._doAction.bind(this, 'app-version', 'spec/paused', false)}>Resume Updates</button>;
      } else if (this.props.channelState === 'UpdateAvailable') {
        return <button className="co-cluster-updates__action-button co-cluster-updates__action-button--update btn btn-primary" onClick={this._doAction.bind(this, 'config', 'triggerUpdate', true)}>Start Upgrade</button>;
      } else if (this.props.channelState === 'Requested') {
        return <button className="co-cluster-updates__action-button btn btn-default" onClick={this._doAction.bind(this, 'config', 'triggerUpdate', false)}>Request to Cancel</button>;
      } else if (this.props.channelState === 'Updating') {
        // Updating + already paused is covered above, so we can assume updating + not paused
        return <button className="co-cluster-updates__action-button btn btn-default" onClick={this._doAction.bind(this, 'app-version', 'spec/paused', true)}>Pause Updates</button>;
      } else if (this.props.channelState === 'UpToDate') {
        if (this.props.config.triggerUpdateCheck) {
          return <button className="co-cluster-updates__action-button btn" disabled={true}><LoadingInline /></button>;
        }
        return <button className="co-cluster-updates__action-button btn btn-default" onClick={this._doAction.bind(this, 'config', 'triggerUpdateCheck', true)}>Check for Updates</button>;
      }
    }
  }

  render() {
    return <span>
      {<OperatorState opState={this.props.channelState} version={this.props.version} /> || <LoadingInline />}
      {this._actionButton()}
    </span>;
  }
}
DetailStatus.propTypes = {
  config: React.PropTypes.object,
  channelState: React.PropTypes.string,
  version: React.PropTypes.string,
};
