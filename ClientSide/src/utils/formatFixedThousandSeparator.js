const formatFixedThousandSeparator = (value) => {
    return new Intl.NumberFormat().format((value).toFixed(0)); // Định dạng số với dấu phân cách nghìn vd: 1000 -> 1.000
};

export default formatFixedThousandSeparator;