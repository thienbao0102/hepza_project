import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * FileReaderComponent
 *
 * Một component dùng để đọc file `.csv` hoặc `.xlsx`, kiểm tra các cột bắt buộc,
 * và chỉ giữ lại các cột này trong dữ liệu đầu ra. Hữu ích trong các ứng dụng nhập liệu hoặc quản lý dữ liệu.
 *
 * @component
 *
 * @param {string[]} requiredColumns - Danh sách các tên cột bắt buộc (không phân biệt hoa thường và khoảng trắng). Nếu thiếu, sẽ hiển thị lỗi.
 * @param {function(Object[]):void} onDataLoaded - Callback nhận dữ liệu sau khi lọc thành công.
 *
 * @example
 * import React from 'react';
 * import FileReaderComponent from '@components/common/FileReaderComponent';
 *
 * const requiredColumns = ['Name', 'Email', 'Age'];
 *
 * const handleDataLoaded = (data) => {
 *   console.log('Dữ liệu đã load:', data);
 * };
 *
 * export default function ImportPage() {
 *   return (
 *     <div>
 *       <h2>Nhập dữ liệu người dùng</h2>
 *       <FileReaderComponent
 *         requiredColumns={requiredColumns}
 *         onDataLoaded={handleDataLoaded}
 *       />
 *     </div>
 *   );
 * }
 */

function FileReaderComponent({ requiredColumns = [], onDataLoaded }) {
    const [data, setData] = useState([]);
    const [fileType, setFileType] = useState('');
    const [error, setError] = useState('');
    const [missingColumns, setMissingColumns] = useState([]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setError('');
        setMissingColumns([]);
        setData([]);

        if (!file) return;

        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.csv')) {
            setFileType('CSV');
            readCSV(file);
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            setFileType('Excel');
            readExcel(file);
        } else {
            setError('❌ Chỉ hỗ trợ file .csv, .xlsx, .xls');
        }
    };

    const checkColumns = (columns) => {
        const normalizedColumns = columns.map((col) => col.trim().toLowerCase());

        const missing = requiredColumns.filter((col) => {
            return !normalizedColumns.includes(col.trim().toLowerCase());
        });

        if (missing.length > 0) {
            setError('❌ Thiếu cột bắt buộc: ' + missing.join(', '));
            setMissingColumns(missing);
            return false;
        }

        return true;
    };


    const normalize = (str) => str.trim().toLowerCase();

    const filterToRequiredColumns = (data) => {
        return data.map((row) => {
            const filtered = {};
            requiredColumns.forEach((col) => {
                // Tìm key khớp (không phân biệt hoa thường, khoảng trắng)
                const matchKey = Object.keys(row).find(
                    (key) => normalize(key) === normalize(col)
                );
                if (matchKey !== undefined) {
                    filtered[col] = row[matchKey];
                }
            });
            return filtered;
        });
    };

    const readCSV = (file) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const fields = results.meta.fields;
                if (checkColumns(fields)) {
                    const filteredData = filterToRequiredColumns(results.data);
                    setData(filteredData);
                    if (onDataLoaded) onDataLoaded(filteredData);
                }
            },
            error: (err) => {
                setError('Lỗi khi đọc CSV: ' + err.message);
            },
        });
    };

    const readExcel = (file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const binaryStr = event.target.result;
            const workbook = XLSX.read(binaryStr, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const parsedData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

            const fields = Object.keys(parsedData[0] || {});
            if (checkColumns(fields)) {
                const filteredData = filterToRequiredColumns(parsedData);
                setData(filteredData);
                if (onDataLoaded) onDataLoaded(filteredData);
            }
        };
        reader.readAsBinaryString(file);
    };


    return (
        <div style={{ padding: '1rem', fontFamily: 'Arial' }}>
            <h3>📄 Đọc file CSV/XLSX & kiểm tra cột</h3>
            <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
            />
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {data.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                    <p>🔍 Đã đọc file: <strong>{fileType}</strong></p>
                    <pre style={{
                        maxHeight: '400px',
                        overflow: 'auto',
                        backgroundColor: '#f5f5f5',
                        padding: '10px',
                        borderRadius: '5px'
                    }}>
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

export default FileReaderComponent;
