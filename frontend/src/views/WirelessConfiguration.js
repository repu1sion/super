import React, { Component } from 'react'

import { wifiAPI } from 'api'
import { APIErrorContext } from 'layouts/Admin'

import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardTitle,
  Row,
  Col
} from 'reactstrap'

export default class WirelessConfiguration extends Component {
  state = { configText: '' }

  static contextType = APIErrorContext

  async componentDidMount() {
    wifiAPI
      .config()
      .then((data) => {
        this.setState({ configText: data })
      })
      .catch((err) => {
        this.context.reportError('API Failure get traffic: ' + err.message)
      })
  }

  render() {
    return (
      <div className="content">
        <Row>
          <Col>
            <Card>
              <CardHeader>
                <h3>Hostapd Configuration:</h3>
              </CardHeader>
              <CardBody>
                <pre>{this.state.configText}</pre>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    )
  }
}
