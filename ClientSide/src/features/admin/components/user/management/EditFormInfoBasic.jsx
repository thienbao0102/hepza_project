import React from "react";
import { Input, Form, DatePicker, Row, Col, Select } from "antd";

const { Option } = Select;

const PersonalInfoForm = ({ formState, onChange }) => (
    <Form layout="vertical">
        <Row gutter={16}>
            <Col span={8}>
                <Form.Item label="Họ và tên" name="fullName" required>
                    <Input
                        value={formState.fullName}
                        onChange={e => onChange("fullName", e.target.value)}
                        placeholder="Nhập họ và tên"
                    />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item label="Chức vụ" name="position" required>
                    <Input
                        value={formState.position}
                        onChange={e => onChange("position", e.target.value)}
                        placeholder="Nhập chức vụ"
                    />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item label="Phòng ban" name="department">
                    <Select
                        value={formState.department}
                        onChange={value => onChange("department", value)}
                        placeholder="Chọn phòng ban"
                    >
                        <Option value="Phòng môi trường">Phòng môi trường</Option>
                        <Option value="Phòng kỹ thuật">Phòng kỹ thuật</Option>
                    </Select>
                </Form.Item>
            </Col>

            <Col span={8}>
                <Form.Item label="Số điện thoại" name="phoneNumber" required>
                    <Input
                        value={formState.phoneNumber}
                        onChange={e => onChange("phoneNumber", e.target.value.replace(/\D/g, ''))}
                        placeholder="Nhập số điện thoại"
                        maxLength={11}
                        inputMode="numeric"
                    />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item label="Email" name="email">
                    <Input
                        value={formState.email}
                        onChange={e => onChange("email", e.target.value)}
                        placeholder="Nhập email"
                    />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item label="Ngày sinh" name="birthday">
                    <DatePicker
                        value={formState.birthday}
                        onChange={date => onChange("birthday", date)}
                        format="DD/MM/YYYY"
                        className="w-full"
                        placeholder="Chọn ngày sinh"
                    />
                </Form.Item>
            </Col>
        </Row>
    </Form>
);

export default PersonalInfoForm;
