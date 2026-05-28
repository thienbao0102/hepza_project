const formatThousandSeparator = (value) => {
    return new Intl.NumberFormat().format((value)); // Định dạng số với dấu phân cách nghìn vd: 1000 -> 1.000
};

export default formatThousandSeparator;