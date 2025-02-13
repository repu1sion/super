import { withRouter } from 'react-router'
import { Link } from 'react-router-dom'
import { deviceAPI } from 'api/Device'
import { Component } from 'react'
import Device from 'components/Devices/Device.js'
import { APIErrorContext } from 'layouts/Admin.js'
import React, { useContext } from 'react'

// reactstrap components
import {
  Button,
  ButtonGroup,
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Label,
  FormGroup,
  Input,
  Table,
  Row,
  Col
} from 'reactstrap'

class DeviceListing extends Component {
  state = { devices: {}, deviceRows: [] }

  static contextType = APIErrorContext

  constructor(props) {
    super(props)
    this.refreshDevices = this.refreshDevices.bind(this)
  }

  async refreshDevices() {
    const d = await deviceAPI.list().catch((error) => {
      this.context.reportError('API Failure: ' + error.message)
    })

    const notifyChange = () => {
      this.refreshDevices()
    }

    if (d) {
      let divs = []
      Object.keys(d).forEach((v) => {
        const generatedID = Math.random().toString(36).substr(2, 9)

        divs.push(
          <Device key={generatedID} device={d[v]} notifyChange={notifyChange} />
        )
      })

      this.setState({ devices: d, deviceRows: divs })
    }
  }

  componentDidMount() {
    this.refreshDevices()
  }

  render() {
    return (
      <div>
        {this.state.alert}
        <Row>
          <Col md="12">
            <Card>
              <CardHeader>
                <Row>
                  <Col md="8">
                    <CardTitle tag="h4">Configured Devices</CardTitle>
                  </Col>
                  <Col md="4" className="text-right">
                    <Link to="/admin/add_device">
                      <Button className="btn-round" color="primary" outline>
                        <i className="fa fa-plus" />
                        Add
                      </Button>
                    </Link>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody>
                <Table responsive>
                  <thead className="text-primary">
                    <tr>
                      <th width="20%">Name</th>
                      <th width="15%" className="text-center">
                        IP/MAC
                      </th>
                      {/*<th className="d-none d-md-table-cell">IP</th>*/}
                      <th width="7%">Auth</th>
                      <th width="25%">Zones</th>
                      <th width="25%">Tags</th>
                      <th width="8%" className="text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>{this.state.deviceRows}</tbody>
                </Table>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    )
  }
}

const DeviceListingWithRouter = withRouter(DeviceListing)
export default DeviceListingWithRouter
