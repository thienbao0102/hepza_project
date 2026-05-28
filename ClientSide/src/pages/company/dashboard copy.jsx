import React from "react";
import DonutChart from "@components/ui/DonutChart";
import Barchart from "@components/ui/BarChart";
import AutoLineChart from "@components/ui/AutoLineChart";
import { Container, Droplet, Sprout, TreePine, Zap, ClipboardPlus, SearchCheck, Trash, Flame, Atom, Calendar } from "lucide-react"
import ParkRoundedIcon from '@mui/icons-material/ParkRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import DiamondRoundedIcon from '@mui/icons-material/DiamondRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import StickyNote2RoundedIcon from '@mui/icons-material/StickyNote2Rounded';
import TextureRoundedIcon from '@mui/icons-material/TextureRounded';
import GrassRoundedIcon from '@mui/icons-material/GrassRounded';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import RecyclingRoundedIcon from '@mui/icons-material/RecyclingRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import CloudRoundedIcon from '@mui/icons-material/CloudRounded';
import OilBarrelRoundedIcon from '@mui/icons-material/OilBarrelRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import AirRoundedIcon from '@mui/icons-material/AirRounded';
import BiotechRoundedIcon from '@mui/icons-material/BiotechRounded';
import InvertColorsRoundedIcon from '@mui/icons-material/InvertColorsRounded';
import { Link } from 'react-router-dom';
import clsx from "clsx";

const DashboardCompany = () => {
    const waterData = [
        { Name: "Nước cấp", Value: 13000, unit: "m³", Color: "#00C0E8" },
        { Name: "Nước mưa", Value: 400, unit: "m³", Color: "#00175D" },
        { Name: "Nước tái chế", Value: 1200, unit: "m³", Color: "#362FBD" },
    ];

    const waterDataByMonth = {
        1: [
            { Name: "Nước cấp", Value: 134000, Color: "#00C0E8" },
            { Name: "Nước mưa", Value: 80000, Color: "#00175D" },
            { Name: "Nước tái chế", Value: 56000, Color: "#362FBD" }
        ],
        2: [
            { Name: "Nước cấp", Value: 120000, Color: "#00C0E8" },
            { Name: "Nước mưa", Value: 95000, Color: "#00175D" },
            { Name: "Nước tái chế", Value: 50000, Color: "#362FBD" }
        ],
        3: [
            { Name: "Nước cấp", Value: 100000, Color: "#00C0E8" },
            { Name: "Nước mưa", Value: 76000, Color: "#00175D" },
            { Name: "Nước tái chế", Value: 42000, Color: "#362FBD" }
        ],
        4: [
            { Name: "Nước cấp", Value: 134000, Color: "#00C0E8" },
            { Name: "Nước mưa", Value: 80000, Color: "#00175D" },
            { Name: "Nước tái chế", Value: 56000, Color: "#362FBD" }
        ],
        5: [
            { Name: "Nước cấp", Value: 190000, Color: "#00C0E8" },
            { Name: "Nước mưa", Value: 95000, Color: "#00175D" },
            { Name: "Nước tái chế", Value: 50000, Color: "#362FBD" }
        ],
        6: [
            { Name: "Nước cấp", Value: 100000, Color: "#00C0E8" },
            { Name: "Nước mưa", Value: 76000, Color: "#00175D" },
            { Name: "Nước tái chế", Value: 42000, Color: "#362FBD" }
        ],
        7: [
            { Name: "Nước cấp", Value: 134000, Color: "#00C0E8" },
            { Name: "Nước mưa", Value: 80000, Color: "#00175D" },
            { Name: "Nước tái chế", Value: 56000, Color: "#362FBD" }
        ],
        8: [
            { Name: "Nước cấp", Value: 120000, Color: "#00C0E8" },
            { Name: "Nước mưa", Value: 95000, Color: "#00175D" },
            { Name: "Nước tái chế", Value: 50000, Color: "#362FBD" }
        ],
        9: [
            { Name: "Nước cấp", Value: 100000, Color: "#00C0E8" },
            { Name: "Nước mưa", Value: 76000, Color: "#00175D" },
            { Name: "Nước tái chế", Value: 42000, Color: "#362FBD" }
        ],
        10: [],
        11: [],
        12: []
    };

    const CO2DataByMonth = {
        1: [
            { Name: "Nguyên vật liệu", Value: 134000, Color: "#2E7D32" }, // xanh lá đậm
            { Name: "Điện", Value: 80000, Color: "#43A047" },
            { Name: "Nước", Value: 56000, Color: "#66BB6A" },
            { Name: "Chất thải", Value: 56000, Color: "#81C784" },
            { Name: "Hóa chất", Value: 56000, Color: "#A5D6A7" },
            { Name: "Chất đốt", Value: 56000, Color: "#C8E6C9" },
        ],
        2: [
            { Name: "Nguyên vật liệu", Value: 120000, Color: "#2E7D32" },
            { Name: "Điện", Value: 70000, Color: "#43A047" },
            { Name: "Nước", Value: 52000, Color: "#66BB6A" },
            { Name: "Chất thải", Value: 45000, Color: "#81C784" },
            { Name: "Hóa chất", Value: 50000, Color: "#A5D6A7" },
            { Name: "Chất đốt", Value: 47000, Color: "#C8E6C9" },
        ],
        3: [
            { Name: "Nguyên vật liệu", Value: 145000, Color: "#2E7D32" },
            { Name: "Điện", Value: 90000, Color: "#43A047" },
            { Name: "Nước", Value: 60000, Color: "#66BB6A" },
            { Name: "Chất thải", Value: 58000, Color: "#81C784" },
            { Name: "Hóa chất", Value: 55000, Color: "#A5D6A7" },
            { Name: "Chất đốt", Value: 53000, Color: "#C8E6C9" },
        ],
        4: [
            { Name: "Nguyên vật liệu", Value: 138000, Color: "#2E7D32" },
            { Name: "Điện", Value: 82000, Color: "#43A047" },
            { Name: "Nước", Value: 58000, Color: "#66BB6A" },
            { Name: "Chất thải", Value: 54000, Color: "#81C784" },
            { Name: "Hóa chất", Value: 51000, Color: "#A5D6A7" },
            { Name: "Chất đốt", Value: 49000, Color: "#C8E6C9" },
        ],
        5: [
            { Name: "Nguyên vật liệu", Value: 150000, Color: "#2E7D32" },
            { Name: "Điện", Value: 95000, Color: "#43A047" },
            { Name: "Nước", Value: 61000, Color: "#66BB6A" },
            { Name: "Chất thải", Value: 60000, Color: "#81C784" },
            { Name: "Hóa chất", Value: 56000, Color: "#A5D6A7" },
            { Name: "Chất đốt", Value: 54000, Color: "#C8E6C9" },
        ],
        6: [
            { Name: "Nguyên vật liệu", Value: 132000, Color: "#2E7D32" },
            { Name: "Điện", Value: 78000, Color: "#43A047" },
            { Name: "Nước", Value: 55000, Color: "#66BB6A" },
            { Name: "Chất thải", Value: 53000, Color: "#81C784" },
            { Name: "Hóa chất", Value: 50000, Color: "#A5D6A7" },
            { Name: "Chất đốt", Value: 48000, Color: "#C8E6C9" },
        ],
        7: [
            { Name: "Nguyên vật liệu", Value: 140000, Color: "#2E7D32" },
            { Name: "Điện", Value: 87000, Color: "#43A047" },
            { Name: "Nước", Value: 59000, Color: "#66BB6A" },
            { Name: "Chất thải", Value: 55000, Color: "#81C784" },
            { Name: "Hóa chất", Value: 53000, Color: "#A5D6A7" },
            { Name: "Chất đốt", Value: 50000, Color: "#C8E6C9" },
        ],
        8: [
            { Name: "Nguyên vật liệu", Value: 125000, Color: "#2E7D32" },
            { Name: "Điện", Value: 75000, Color: "#43A047" },
            { Name: "Nước", Value: 52000, Color: "#66BB6A" },
            { Name: "Chất thải", Value: 50000, Color: "#81C784" },
            { Name: "Hóa chất", Value: 47000, Color: "#A5D6A7" },
            { Name: "Chất đốt", Value: 45000, Color: "#C8E6C9" },
        ],
        9: [
            { Name: "Nguyên vật liệu", Value: 130000, Color: "#2E7D32" },
            { Name: "Điện", Value: 77000, Color: "#43A047" },
            { Name: "Nước", Value: 54000, Color: "#66BB6A" },
            { Name: "Chất thải", Value: 52000, Color: "#81C784" },
            { Name: "Hóa chất", Value: 49000, Color: "#A5D6A7" },
            { Name: "Chất đốt", Value: 46000, Color: "#C8E6C9" },
        ],
        10: [],
        11: [],
        12: []
    };

    const electricalData = [
        { Name: "Điện lưới", Value: 133000, unit: "kWh", Color: "#FF9D00" },
        { Name: "Điện tái tạo", Value: 2500, unit: "kWh", Color: "#00A6FF" },
    ];

    const electicalDataByMonth = {
        1: [
            { Name: "Điện lưới", Value: 134000, Color: "#FF9D00" },
            { Name: "Điện tái tạo", Value: 80000, Color: "#00A6FF" },
        ],
        2: [
            { Name: "Điện lưới", Value: 120000, Color: "#FF9D00" },
            { Name: "Điện tái tạo", Value: 95000, Color: "#00A6FF" },
        ],
        3: [
            { Name: "Điện lưới", Value: 100000, Color: "#FF9D00" },
            { Name: "Điện tái tạo", Value: 76000, Color: "#00A6FF" },
        ],
        4: [
            { Name: "Điện lưới", Value: 134000, Color: "#FF9D00" },
            { Name: "Điện tái tạo", Value: 80000, Color: "#00A6FF" },
        ],
        5: [
            { Name: "Điện lưới", Value: 190000, Color: "#FF9D00" },
            { Name: "Điện tái tạo", Value: 95000, Color: "#00A6FF" },
        ],
        6: [
            { Name: "Điện lưới", Value: 100000, Color: "#FF9D00" },
            { Name: "Điện tái tạo", Value: 76000, Color: "#00A6FF" },
        ],
        7: [
            { Name: "Điện lưới", Value: 134000, Color: "#FF9D00" },
            { Name: "Điện tái tạo", Value: 80000, Color: "#00A6FF" },
        ],
        8: [
            { Name: "Điện lưới", Value: 120000, Color: "#FF9D00" },
            { Name: "Điện tái tạo", Value: 95000, Color: "#00A6FF" },
        ],
        9: [
            { Name: "Điện lưới", Value: 100000, Color: "#FF9D00" },
            { Name: "Điện tái tạo", Value: 76000, Color: "#00A6FF" },
        ],
        10: [],
        11: [],
        12: []
    };


    // const totalValue = sampleData.reduce((sum, item) => sum + item.value, 0);
    return (
        <div className="flex flex-col items-center justify-between gap-4 p-4">
            <div className="flex items-center justify-between gap-4 w-full">
                <div className="flex items-center gap-2">
                    <span className="flex flex-col">
                        <h2 className="text-2xl font-semibold leading-tight">
                            Tổng quan
                        </h2>
                        <p className="text-gray-600">Chào mừng trở lại!</p>
                    </span>
                </div>
                <div>
                    <span className="flex items-center gap-2 bg-gray-300 p-2 rounded-2xl px-4 cursor-pointer text-gray-600">
                        <p>09/2025</p>
                        <Calendar className="size-5" />
                    </span>
                </div>
            </div>
            <div className="flex flex-col flex-grow h-fit w-full gap-2">
                <div className="flex w-full items-stretch h-[190px] gap-2">
                    <div className="flex flex-col h-full aspect-square bg-gradient-to-br from-[#11432C] to-[#1D8651] rounded-2xl p-[10px]">
                        <div className="flex w-full h-fit text-white items-center gap-2">
                            <span className="h-7 aspect-square bg-[#1D8651] rounded-[10px] flex justify-center items-center">
                                <Sprout className="size-4" />
                            </span>
                            <p className="font-semibold">Phát thải CO₂</p>
                        </div>
                        <div className="main-data flex w-full flex-grow items-center text-3xl text-white font-semibold ">
                            <p className="[text-shadow:0_0_12px_rgba(1,251,30,0.33)]">894.911</p>
                        </div>
                        <span className="flex h-fit w-full text-[#40FF9E]">
                            <p>Tấn CO₂ / tháng</p>
                        </span>
                    </div>
                    <div className="flex flex-grow flex-col gap-2">
                        <div className="flex flex-1 gap-2">
                            <CardContainer
                                icon={
                                    <span className="h-7 aspect-square bg-[#1D8651] rounded-[10px] flex justify-center items-center">
                                        <Sprout className="size-4 text-white" />
                                    </span>
                                }
                                title={"CO₂ / tháng - Nguyên vật liệu"}
                                className={"flex-1"}
                            >
                                <span className="flex-grow flex justify-center items-end gap-2 text-[#1D8651] font-medium">
                                    <p className="text-2xl leading-none">230.118</p>
                                    <p>Tấn CO₂</p>
                                </span>
                            </CardContainer>
                            <CardContainer
                                icon={
                                    <span className="h-7 aspect-square bg-[#1D8651] rounded-[10px] flex justify-center items-center">
                                        <Sprout className="size-4 text-white" />
                                    </span>
                                }
                                title={"CO₂ / tháng - Điện"}
                                className={"flex-1"}
                            >
                                <span className="flex-grow flex justify-center items-end gap-2 text-[#1D8651] font-medium">
                                    <p className="text-2xl leading-none">21.276</p>
                                    <p>Tấn CO₂</p>
                                </span>
                            </CardContainer>
                            <CardContainer
                                icon={
                                    <span className="h-7 aspect-square bg-[#1D8651] rounded-[10px] flex justify-center items-center">
                                        <Sprout className="size-4 text-white" />
                                    </span>
                                }
                                title={"CO₂ / tháng - Nước"}
                                className={"flex-1"}
                            >
                                <span className="flex-grow flex justify-center items-end gap-2 text-[#1D8651] font-medium">
                                    <p className="text-2xl leading-none">12.509</p>
                                    <p>Tấn CO₂</p>
                                </span>
                            </CardContainer>
                        </div>
                        <div className="flex flex-1 gap-2">
                            <CardContainer
                                icon={
                                    <span className="h-7 aspect-square bg-[#1D8651] rounded-[10px] flex justify-center items-center">
                                        <Sprout className="size-4 text-white" />
                                    </span>
                                }
                                title={"CO₂ / tháng - Chất thải"}
                                className={"flex-1"}
                            >
                                <span className="flex-grow flex justify-center items-end gap-2 text-[#1D8651] font-medium">
                                    <p className="text-2xl leading-none">286.960</p>
                                    <p>Tấn CO₂</p>
                                </span>
                            </CardContainer>
                            <CardContainer
                                icon={
                                    <span className="h-7 aspect-square bg-[#1D8651] rounded-[10px] flex justify-center items-center">
                                        <Sprout className="size-4 text-white" />
                                    </span>
                                }
                                title={"CO₂ / tháng - Chất đốt"}
                                className={"flex-1"}
                            >
                                <span className="flex-grow flex justify-center items-end gap-2 text-[#1D8651] font-medium">
                                    <p className="text-2xl leading-none">311.657</p>
                                    <p>Tấn CO₂</p>
                                </span>
                            </CardContainer>
                            <CardContainer
                                icon={
                                    <span className="h-7 aspect-square bg-[#1D8651] rounded-[10px] flex justify-center items-center">
                                        <Sprout className="size-4 text-white" />
                                    </span>
                                }
                                title={"CO₂ / tháng - Hóa chất"}
                                className={"flex-1"}
                            >
                                <span className="flex-grow flex justify-center items-end gap-2 text-[#1D8651] font-medium">
                                    <p className="text-2xl leading-none">32.533</p>
                                    <p>Tấn CO₂</p>
                                </span>
                            </CardContainer>
                        </div>
                    </div>
                </div>
                <div className="flex w-full items-stretch h-[260px] gap-2">
                    <CardContainer
                        icon={
                            <span className="h-7 aspect-square bg-[#1D8651] rounded-[10px] flex justify-center items-center">
                                <Sprout className="size-4 text-white" />
                            </span>
                        }
                        title={"Biểu đồ phát thải CO₂ theo tháng"}
                        className={"flex-grow"}
                    >
                        <AutoLineChart dataByMonth={CO2DataByMonth} currentMonth={9} unit={"Tấn CO₂"} />
                    </CardContainer>
                </div>
                <div className="flex w-full items-stretch h-[260px] gap-2">
                    <CardContainer
                        icon={
                            <span className="h-7 aspect-square bg-[#00C0E8] rounded-[10px] flex justify-center items-center">
                                <Droplet className="size-4 text-white" />
                            </span>
                        }
                        title={"Nước sử dụng"}
                    >
                        <DonutChart data={waterData} totalValue={14600} unit="m³" />
                    </CardContainer>
                    <CardContainer
                        icon={
                            <span className="h-7 aspect-square bg-[#00C0E8] rounded-[10px] flex justify-center items-center">
                                <Droplet className="size-4 text-white" />
                            </span>
                        }
                        title={"Biểu đồ Từng loại nước sử dụng trong năm"}
                        className={"flex-grow"}
                    >
                        <Barchart dataByMonth={waterDataByMonth} currentMonth={9} unit="m³" />
                    </CardContainer>
                </div>
                <div className="flex w-full items-stretch h-[260px] gap-2">
                    <CardContainer
                        icon={
                            <span className="h-7 aspect-square bg-[#FF9D00] rounded-[10px] flex justify-center items-center">
                                <Zap className="size-4 text-white" />
                            </span>
                        }
                        title={"Điện sử dụng"}
                    >
                        <DonutChart data={electricalData} totalValue={135500} unit="kWh" />
                    </CardContainer>
                    <div className="flex flex-col w-80 gap-2">
                        <CardContainer
                            icon={
                                <span className="h-7 aspect-square bg-[#FF9D00] rounded-[10px] flex justify-center items-center">
                                    <Zap className="size-4 text-white" />
                                </span>
                            }
                            title={"Điện lưới sử dụng"}
                            className={"w-full flex-1"}
                        >
                            <div className="flex flex-grow justify-evenly">
                                <div className="flex flex-col justify-end items-center text-gray-700">
                                    <p>Sinh hoạt</p>
                                    <p className="font-semibold text-2xl text-[#FF9D00]">500</p>
                                    <p className="text-xs">kWh</p>
                                </div>
                                <div className="flex flex-col justify-end items-center text-gray-700">
                                    <p>Sản xuất</p>
                                    <p className="font-semibold text-2xl text-[#FF9D00]">132.500</p>
                                    <p className="text-xs">kWh</p>
                                </div>
                            </div>
                        </CardContainer>
                        <CardContainer
                            icon={
                                <span className="h-7 aspect-square bg-[#FF9D00] rounded-[10px] flex justify-center items-center">
                                    <Zap className="size-4 text-white" />
                                </span>
                            }
                            title={"Điện tái tạo sử dụng"}
                            className={"w-full flex-1"}
                        >
                            <div className="flex flex-grow justify-evenly">
                                <div className="flex flex-col justify-end items-center text-gray-700">
                                    <p>Sinh hoạt</p>
                                    <p className="font-semibold text-2xl text-[#FF9D00]">2,500 </p>
                                    <p className="text-xs">kWh</p>
                                </div>
                                <div className="flex flex-col justify-end items-center text-gray-700">
                                    <p>Sản xuất</p>
                                    <p className="font-semibold text-2xl text-[#FF9D00]">0</p>
                                    <p className="text-xs">kWh</p>
                                </div>
                            </div>
                        </CardContainer>
                    </div>
                    <CardContainer
                        icon={
                            <span className="h-7 aspect-square bg-[#FF9D00] rounded-[10px] flex justify-center items-center">
                                <Zap className="size-4 text-white" />
                            </span>
                        }
                        title={"Biểu đồ Từng loại Điện sử dụng trong năm"}
                        className={"flex-grow"}
                    >
                        <Barchart dataByMonth={electicalDataByMonth} currentMonth={9} unit={"kWh"} />
                    </CardContainer>
                </div>
                <div className="flex w-full items-stretch h-fit gap-2">
                    <ResourceCardContainer
                        icon={
                            <span className="h-7 aspect-square bg-[#4E5BA6] rounded-[10px] flex justify-center items-center">
                                <Container className="size-4 text-white" />
                            </span>
                        }
                        title={"Nguyên vật liệu"}
                        className={"flex-grow"}
                    >
                        <div className="flex flex-grow w-full relative">
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#4E5BA6]/20 flex justify-center items-center text-[#4E5BA6]">
                                        <ParkRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Gỗ và Liên quan gỗ"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#4E5BA6]/20 flex justify-center items-center text-[#4E5BA6]">
                                        <DashboardRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Kim loại & Hợp kim"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#4E5BA6]/20 flex justify-center items-center text-[#4E5BA6]">
                                        <DiamondRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Phi kim"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#4E5BA6]/20 flex justify-center items-center text-[#4E5BA6]">
                                        <CategoryRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Polyme & Nhựa"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#4E5BA6]/20 flex justify-center items-center text-[#4E5BA6]">
                                        <StickyNote2RoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Giấy & Bìa carton"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#4E5BA6]/20 flex justify-center items-center text-[#4E5BA6]">
                                        <TextureRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Vải & sợi"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#4E5BA6]/20 flex justify-center items-center text-[#4E5BA6]">
                                        <GrassRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Thực phẩm & Nông sản"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                        </div>
                        <div className="flex gap-8 w-full">
                            <ResourceQuickLink
                                icon={<Container className="size-4 text-[#4E5BA6]" />}
                                title={"Đi đến trang Nguyên vật liệu"}
                            />
                            <ResourceQuickLink
                                icon={<ClipboardPlus className="size-4 text-[#4E5BA6]" />}
                                title={"Đi đến trang khai báo Tài nguyên và Chất thải"}
                            />
                            <ResourceQuickLink
                                icon={<SearchCheck className="size-4 text-[#4E5BA6]" />}
                                title={"Đi đến trang Giải pháp Nguyên vật liệu"}
                            />
                        </div>
                    </ResourceCardContainer>
                </div>
                <div className="flex w-full items-stretch h-fit gap-2">
                    <ResourceCardContainer
                        icon={
                            <span className="h-7 aspect-square bg-[#00EA4A] rounded-[10px] flex justify-center items-center">
                                <Trash className="size-4 text-white" />
                            </span>
                        }
                        title={"Chất thải"}
                        className={"flex-grow"}
                    >
                        <div className="flex flex-grow w-full relative">
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#00EA4A]/20 flex justify-center items-center text-[#00EA4A]">
                                        <HomeRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Sinh hoạt"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#00EA4A]/20 flex justify-center items-center text-[#00EA4A]">
                                        <RecyclingRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Tái chế"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#00EA4A]/20 flex justify-center items-center text-[#00EA4A]">
                                        <ReportProblemRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Nguy hại"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#00EA4A]/20 flex justify-center items-center text-[#00EA4A]">
                                        <CategoryRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Không nguy hại"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                        </div>
                        <div className="flex gap-8">
                            <ResourceQuickLink
                                icon={<Trash className="size-4 text-[#00EA4A]" />}
                                title={"Đi đến trang Chất thải"}
                            />
                            <ResourceQuickLink
                                icon={<ClipboardPlus className="size-4 text-[#00EA4A]" />}
                                title={"Đi đến trang khai báo Tài nguyên và Chất thải"}
                            />
                            <ResourceQuickLink
                                icon={<SearchCheck className="size-4 text-[#00EA4A]" />}
                                title={"Đi tới trang Giải pháp Chất thải"}
                            />
                        </div>
                    </ResourceCardContainer>
                </div>
                <div className="flex w-full items-stretch h-fit gap-2">
                    <ResourceCardContainer
                        icon={
                            <span className="h-7 aspect-square bg-[#ff6254] rounded-[10px] flex justify-center items-center">
                                <Flame className="size-4 text-white" />
                            </span>
                        }
                        title={"Chất đốt"}
                        className={"flex-grow"}
                    >
                        <div className="flex flex-grow w-full relative">
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#ff6254]/20 flex justify-center items-center text-[#ff6254]">
                                        <LocalFireDepartmentRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Than"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#ff6254]/20 flex justify-center items-center text-[#ff6254]">
                                        <CloudRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Biomass (Sinh khối)"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#ff6254]/20 flex justify-center items-center text-[#ff6254]">
                                        <OilBarrelRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Nhiên liệu dầu mỏ"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#ff6254]/20 flex justify-center items-center text-[#ff6254]">
                                        <AirRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Chất đốt dạng khí"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                        </div>
                        <div className="flex gap-8">
                            <ResourceQuickLink
                                icon={<Container className="size-4 text-[#ff6254]" />}
                                title={"Đi đến trang Chất đốt"}
                            />
                            <ResourceQuickLink
                                icon={<ClipboardPlus className="size-4 text-[#ff6254]" />}
                                title={"Đi đến trang khai báo Tài nguyên và Chất thải"}
                            />
                            < ResourceQuickLink
                                icon={<SearchCheck className="size-4 text-[#ff6254]" />}
                                title={"Đi đến trang Giải pháp Chất đốt"}
                            />
                        </div>
                    </ResourceCardContainer>
                </div>
                <div className="flex w-full items-stretch h-fit gap-2">
                    <ResourceCardContainer
                        icon={
                            <span className="h-7 aspect-square bg-[#867bfb] rounded-[10px] flex justify-center items-center">
                                <Atom className="size-4 text-white" />
                            </span>
                        }
                        title={"Hóa chất"}
                        className={"flex-grow"}
                    >
                        <div className="flex flex-grow w-full relative">
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#867bfb]/20 flex justify-center items-center text-[#867bfb]">
                                        <ScienceRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Axit"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#867bfb]/20 flex justify-center items-center text-[#867bfb]">
                                        <DashboardRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Bazơ / kiềm"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#867bfb]/20 flex justify-center items-center text-[#867bfb]">
                                        <AutoAwesomeRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Muối"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#867bfb]/20 flex justify-center items-center text-[#867bfb]">
                                        <OilBarrelRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Dung môi"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#867bfb]/20 flex justify-center items-center text-[#867bfb]">
                                        <StickyNote2RoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Khí & Hóa chất bay hơi"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#867bfb]/20 flex justify-center items-center text-[#867bfb]">
                                        <BiotechRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Phụ gia / chất trợ"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                            <ResourceCard
                                icon={
                                    <span className="h-11 aspect-square rounded-full bg-[#867bfb]/20 flex justify-center items-center text-[#867bfb]">
                                        <InvertColorsRoundedIcon className="size-6" />
                                    </span>
                                }
                                title={"Chất khử / chất oxy hóa"}
                                data={"150"}
                                unit={"Tấn"}
                            />
                        </div>
                        <div className="flex gap-8">
                            <ResourceQuickLink
                                icon={<Container className="size-4 text-[#867bfb]" />}
                                title={"Đi đến trang Hóa chất"}
                            />
                            <ResourceQuickLink
                                icon={<ClipboardPlus className="size-4 text-[#867bfb]" />}
                                title={"Đi đến trang khai báo Tài nguyên và Chất thải"}
                            />
                            <ResourceQuickLink
                                icon={<SearchCheck className="size-4 text-[#867bfb]" />}
                                title={"Đi đến trang Giải pháp Hóa chất"}
                            />
                        </div>
                    </ResourceCardContainer>
                </div>
            </div>
        </div>
    );
}

export default DashboardCompany;

const ResourceCard = ({ icon, title, data, unit }) => {
    return (
        <div className="flex gap-2 flex-1">
            <div className="flex">
                {icon}
            </div>
            <div className="flex flex-col flex-1 text-gray-600">
                <p className="truncate w-full overflow-visible">{title}</p>
                <span className="flex items-end gap-1">
                    <p className="text-2xl font-medium text-black leading-none">{data}</p>
                    <p>{unit}</p>
                </span>
            </div>
        </div>
    );
}

const CardContainer = ({ icon, title, children, className }) => {
    return (
        <div
            className={clsx(
                "flex flex-col w-fit bg-white border border-black/20 rounded-2xl p-[10px] gap-1",
                className
            )}
        >
            {/* Header */}
            <div className="flex w-full overflow-visible h-fit text-gray-600 items-center gap-2">
                {icon}
                <p className="truncate overflow-visible">{title}</p>
            </div>

            {/* Body content */}
            <div className="flex flex-grow w-full relative">
                {children}
            </div>
        </div>
    );
};

const ResourceCardContainer = ({ icon, title, children, className }) => {
    return (
        <div
            className={clsx(
                "flex flex-col w-fit bg-white border border-black/20 rounded-2xl p-[10px] gap-3",
                className
            )}
        >
            {/* Header */}
            <div className="flex w-full overflow-visible h-fit text-gray-600 items-center gap-2">
                {icon}
                <p className="truncate overflow-visible">{title}</p>
            </div>

            {children}
        </div>
    );
};

const ResourceQuickLink = ({ icon, title, url }) => {
    return (
        <Link
            to={url}
            className="flex items-center gap-2 rounded-lg transition"
        >
            {icon}
            <span className="text-sm text-gray-600 underline underline-dashed underline-offset-2 [text-decoration-style:dotted] decoration-gray-500">{title}</span>
        </Link>
    );
};