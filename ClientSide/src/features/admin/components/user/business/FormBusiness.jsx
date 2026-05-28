import React from "react";
import { Typography, Row, Col } from "antd";
import { BankOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const CompanyInfoBlock = ({ company }) => {
    return (


        <Row gutter={[16, 16]}>
            <Col xs={24} md={6}>
                <Text strong>Tên doanh nghiệp</Text>
                <div>{company.name}</div>
            </Col>
            <Col xs={24} md={6}>
                <Text strong>Mã số thuế</Text>
                <div>{company.taxCode}</div>
            </Col>
            <Col xs={24} md={6}>
                <Text strong>Khu công nghiệp</Text>
                <div>{company.industryZone}</div>
            </Col>
            <Col xs={24} md={6}>
                <Text strong>Người quản lý</Text>
                <div>{company.manager}</div>
            </Col>
        </Row>
    );
};

export default CompanyInfoBlock;
