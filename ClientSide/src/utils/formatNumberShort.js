import { format } from "d3-format";

const formatNumberShort = (value) => {
    return format(".0s")(value); // Định dạng theo chuẩn ".0s" vd: 1000 -> 1k, 1000000 -> 1M
};

export default formatNumberShort;