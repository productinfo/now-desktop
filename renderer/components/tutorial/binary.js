// Native
import { execSync } from 'child_process'

// Packages
import React, { Component } from 'react'
import semVer from 'semver'
import pathType from 'path-type'
import exists from 'path-exists'

// Utilities
import installBinary from '../../utils/load-binary'
import remote from '../../utils/electron'

const initialState = {
  binaryInstalled: false,
  installing: false,
  done: false,
  downloading: false,
  progress: 0
}

class Binary extends Component {
  constructor(props) {
    super(props)
    this.state = initialState
  }

  async isOlderThanLatest(utils, binaryPath) {
    let current

    try {
      current = await utils.getURL()
    } catch (err) {
      return
    }

    if (!current) {
      return
    }

    const remoteVersion = current.version
    let localVersion

    try {
      localVersion = execSync(binaryPath + ' -v').toString()
    } catch (err) {
      return
    }

    const comparision = semVer.compare(remoteVersion, localVersion)

    if (comparision === 1) {
      return true
    }

    return false
  }

  async installedWithNPM() {
    const globalPackages = remote.require('global-packages')
    let packages

    try {
      packages = await globalPackages()
    } catch (err) {
      return false
    }

    const found = packages.find(item => {
      return item.name === 'now'
    })

    if (!found || found.linked) {
      return false
    }

    return true
  }

  async binaryInstalled() {
    const binaryUtils = remote.require('./utils/binary')
    const binaryPath = binaryUtils.getFile()

    if (await this.installedWithNPM()) {
      return true
    }

    if (!await exists(binaryPath)) {
      return false
    }

    if (await pathType.symlink(binaryPath)) {
      return false
    }

    if (await this.isOlderThanLatest(binaryUtils, binaryPath)) {
      return false
    }

    return true
  }

  async componentDidMount() {
    const currentWindow = remote.getCurrentWindow()

    if (await this.binaryInstalled()) {
      currentWindow.focus()

      this.setState({
        binaryInstalled: true
      })
    }

    // We need to refresh the state of the binary section
    // each time the window gets opened
    // because the user might deleted the binary
    currentWindow.on('show', async () => {
      if (this.state.installing) {
        return
      }

      const originalState = Object.assign({}, initialState)
      originalState.binaryInstalled = await this.binaryInstalled()

      this.setState(originalState)
    })
  }

  render() {
    const element = this

    let classes = 'button install'
    let installText = 'Install now'

    if (this.state.binaryInstalled) {
      classes += ' off'
      installText = 'Already installed'
    }

    const binaryButton = {
      className: classes,
      onClick() {
        if (element.state.binaryInstalled) {
          return
        }

        installBinary(element)
      }
    }

    if (this.state.installing) {
      return (
        <article>
          <p>
            <strong>Installing the command line interface...</strong>
          </p>

          <p>
            This should not take too long. If you want, you can minimize this window. We
            {`'`}
            ll let you know once we are done.
          </p>

          <aside className="progress">
            <span style={{ width: `${this.state.progress}%` }} />
          </aside>

          <style jsx>
            {`
            article {
              width: 415px;
              font-size: 14px;
              text-align: center;
              line-height: 22px;
            }

            .progress {
              background: #636363;
              height: 20px;
              width: 250px;
              overflow: hidden;
              margin: 20px auto 0 auto;
              border-radius: 3px;
            }

            .progress span {
              display: block;
              background: #fff;
              height: inherit;
            }
          `}
          </style>
        </article>
      )
    }

    if (this.state.done) {
      return (
        <article>
          <p><strong>Hooray! 🎉</strong></p>
          <p>The binary successfully landed in its directory!</p>
          <p>You can now use <code>now</code> from the command line.</p>

          <style jsx>
            {`
            article {
              width: 415px;
              font-size: 14px;
              text-align: center;
              line-height: 22px;
            }

            code {
              font-weight: 700;
              background: #212121;
              padding: 1px 7px;
              border-radius: 3px;
            }
          `}
          </style>
        </article>
      )
    }

    return (
      <article>
        <p>
          In addition to this app, you can also use
          {' '}
          <code>now</code>
          {' '}
          from the command line, if you{`'`}d like to.
        </p>
        <p>
          Press the button below to install it! When a new version gets released, we
          {`'`}
          ll automatically update it for you.
        </p>

        <a {...binaryButton}>{installText}</a>

        <style jsx>
          {`
          article {
            width: 415px;
            font-size: 14px;
            text-align: center;
            line-height: 22px;
          }

          code {
            font-weight: 700;
            background: #212121;
            padding: 1px 7px;
            border-radius: 3px;
          }

          .button {
            font-weight: 700;
            text-transform: uppercase;
            background: #000;
            border: 2px solid #fff;
            text-align: center;
            text-decoration: none;
            color: #fff;
            font-size: 12px;
            padding: 8px 20px;
            transition: color .2s ease, background .2s ease;
            cursor: pointer;
            display: inline-block;
            line-height: normal;
            -webkit-app-region: no-drag;
          }

          .button:hover {
            background: #fff;
            color: #000;
          }

          .install {
            margin-top: 20px;
            display: inline-block;
          }

          .install.off {
            background: transparent;
            font-size: 13px;
            cursor: default;
            color: #636363;
            border-color: currentColor;
          }
        `}
        </style>
      </article>
    )
  }
}

export default Binary
