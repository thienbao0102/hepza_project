import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography, Button, Tag, Row, Col, Spin } from "antd";
import { GET_USER_BY_ID_ROUTE } from "@constants/constants";
import { ArrowLeftOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const mockData = {
    id: "QL-2023-005",
    fullName: "Trần Quản Lý",
    password: "********",
    position: "Chuyên viên quản lý môi trường",
    phoneNumber: "0909123456",
    email: "tranquanly@hepza.gov.vn",
    department: "Phòng Môi trường",
    zones: "Hiệp Phước, Tân Tạo",
    status: "Đang hoạt động",
    createdAt: "15/03/2023",
    lastLogin: "28/06/2023 14:30",
    solutionsProposed: 12,
    solutionsDeployed: 8,
    solutionsPending: 3,
    successRate: 92,
};

const fetchUserDetail = async (id) => {
    // TODO: Replace with real API call
    // const res = await fetch(GET_USER_BY_ID_ROUTE(id));
    // return await res.json();
    return mockData;
};

const DetailManagementPage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetchUserDetail()
            .then((data) => setUser(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading || !user)
        return (
            <div className="flex justify-center items-center h-96">
                <Spin size="large" />
            </div>
        );

    return (
        <div className="p-6 mx-auto max-w-7xl">
            <div className="flex justify-between items-center mb-6">
                <Title level={3} className="!mb-0">
                    Chi tiết tài khoản
                </Title>
                <div className="flex gap-2">
                    <Button onClick={() => navigate(-1)} icon={<ArrowLeftOutlined />}>
                        Quay lại
                    </Button>
                    <Button>Nhập dữ liệu</Button>
                    <Button>Xuất dữ liệu</Button>
                </div>
            </div>
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-[270px] max-w-full">
                    <Card
                        title={<b>Thông tin cơ bản</b>}
                        bordered={false}
                        className="h-full"
                    >
                        <div className="mb-2">
                            <Text strong>Mã tài khoản:</Text>{" "}
                            <span className="text-blue-600 cursor-pointer">{user.id}</span>
                        </div>
                        <div className="mb-2">
                            <Text strong>Họ và tên:</Text> {user.fullName}
                        </div>
                        <div className="mb-2">
                            <Text strong>Mật khẩu:</Text>{" "}
                            <span>
                                ********{" "}
                                <a className="text-blue-500 cursor-pointer">Hiển thị</a>
                            </span>
                        </div>
                        <div className="mb-2">
                            <Text strong>Chức vụ:</Text> {user.position}
                        </div>
                    </Card>
                </div>
                <div className="flex-1 min-w-[270px] max-w-full">
                    <Card
                        title={<b>Thông tin liên hệ</b>}
                        bordered={false}
                        className="h-full"
                    >
                        <div className="mb-2">
                            <Text strong>Số điện thoại:</Text> {user.phoneNumber}
                        </div>
                        <div className="mb-2">
                            <Text strong>Email:</Text> {user.email}
                        </div>
                        <div className="mb-2">
                            <Text strong>Phòng ban:</Text> {user.department}
                        </div>
                        <div className="mb-2">
                            <Text strong>KCN quản lý:</Text> {user.zones}
                        </div>
                    </Card>
                </div>
                <div className="flex-1 min-w-[270px] max-w-full">
                    <Card title={<b>Hoạt động</b>} bordered={false} className="h-full">
                        <div className="mb-2">
                            <Text strong>Trạng thái:</Text>{" "}
                            <Tag color="green">{user.status}</Tag>
                        </div>
                        <div className="mb-2">
                            <Text strong>Ngày tạo:</Text> {user.createdAt}
                        </div>
                        <div className="mb-2">
                            <Text strong>Lần đăng nhập cuối:</Text> {user.lastLogin}
                        </div>
                        <div className="mb-2">
                            <Text strong>Số giải pháp đề xuất:</Text> {user.solutionsProposed}
                        </div>
                    </Card>
                </div>
            </div>
            <Row gutter={16} className="mb-6">
                <Col span={6}>
                    <Card className="text-center">
                        <Title level={3}>{user.solutionsProposed}</Title>
                        <div>Giải pháp đã đề xuất</div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="text-center">
                        <Title level={3}>{user.solutionsDeployed}</Title>
                        <div>Giải pháp đã triển khai</div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="text-center">
                        <Title level={3}>{user.solutionsPending}</Title>
                        <div>Giải pháp đang chờ</div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="text-center">
                        <Title level={3}>{user.successRate}%</Title>
                        <div>Tỷ lệ thành công</div>
                    </Card>
                </Col>
            </Row>
            <div className="flex gap-4">
                <Button>Chỉnh sửa quyền</Button>
                <Button type="primary">Reset mật khẩu</Button>
            </div>
        </div>
    );
};

export default DetailManagementPage;
