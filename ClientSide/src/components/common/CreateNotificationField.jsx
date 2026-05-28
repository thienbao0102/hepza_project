import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, CaseLower, CaseSensitive, CaseUpper, Italic, Link, List, ListOrdered, Redo, Subscript, Superscript, Underline, Undo, ZoomIn, ZoomOut, ChevronDown, AlertTriangle, Bell } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "@components/common/quill.css"
import { motion, AnimatePresence } from "framer-motion";
import MultipleFileUpload from "@/components/common/MultipleFileUpload";

const NotificationTypeSelect = ({ value, onChange, readOnly }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const options = [
        { value: 'Info', label: 'Bình thường', icon: Bell, color: 'text-[#4E5BA6]', bg: 'bg-[#4E5BA6]/10' },
        { value: 'Warning', label: 'Cảnh báo', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
    ];

    const currentOption = options.find(o => o.value === value) || options[0];
    const CurrentIcon = currentOption.icon;

    return (
        <div className="relative shrink-0 h-fit" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => !readOnly && setIsOpen(!isOpen)}
                className={`flex items-center justify-between gap-4 px-3 py-2 border rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 outline-none min-w-[170px]
                    ${readOnly ? 'bg-gray-50 border-gray-100 cursor-default opacity-80' : isOpen ? 'border-[#4E5BA6] ring-4 ring-[#4E5BA6]/10 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${currentOption.bg} ${currentOption.color}`}>
                        <CurrentIcon className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-medium text-gray-800">{currentOption.label}</span>
                </div>
                {!readOnly && <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute top-full left-0 right-0 mt-1.5 p-1.5 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100 z-50 overflow-hidden flex flex-col gap-0.5"
                    >
                        {options.map((option) => {
                            const Icon = option.icon;
                            const isSelected = value === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange({ target: { name: 'type', value: option.value } });
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg transition-all duration-200
                                        ${isSelected ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${option.bg} ${option.color}`}>
                                            <Icon className="w-4 h-4" strokeWidth={2.5} />
                                        </div>
                                        <span className={`text-sm ${isSelected ? 'font-medium text-gray-900' : 'font-medium text-gray-600'}`}>
                                            {option.label}
                                        </span>
                                    </div>
                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#4E5BA6]" />}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const CreateNotificationField = ({
    formData,
    dispatch,
    formErrors,
    setFormErrors,
    readOnly,
    attachments = [],
    onAttachmentsChange = () => {},
}) => {
    const [zoom, setZoom] = useState(1);
    const [characterCount, setCharacterCount] = useState(0);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormErrors({ ...formErrors, [name]: "" });

        // 3. Sử dụng dispatch để gửi action lên Component Cha
        dispatch({
            type: 'UPDATE_FIELD',
            field: name, // name tương ứng với key trong formData (title, datetime, v.v.)
            payload: value,
        });
    };

    const handleQuillChange = (editor) => {

        setFormErrors({ ...formErrors, body: "" });

        const plainText = editor.getText();
        const htmlContent = editor.getHTML();
        dispatch({
            type: 'UPDATE_FIELD',
            field: 'body',
            payload: htmlContent,
        });
        const count = plainText.length > 1 ? plainText.length - 1 : 0;
        setCharacterCount(count);
        if (count <= 0) {
            dispatch({
                type: 'UPDATE_FIELD',
                field: 'body',
                payload: "",
            });
        }
    };

    useEffect(() => {
        // 1. Lấy đối tượng Date hiện tại (hoặc bất kỳ Date nào bạn muốn)
        const now = new Date();

        // const specificDate = new Date('2025-10-27T00:00:00');
        // const dateToFormat = specificDate; // hoặc dùng 'now' nếu muốn ngày hiện tại
        const dateToFormat = now;

        // 2. Định nghĩa các tùy chọn để format
        const options = {
            // Phần thời gian: Giờ:Phút, dùng định dạng 2 chữ số (00:00)
            hour: '2-digit',
            minute: '2-digit',
            hour12: false, // Bắt buộc dùng định dạng 24 giờ

            // Phần ngày trong tuần: Thứ
            weekday: 'long',

            // Phần ngày/tháng/năm
            day: '2-digit',
            month: 'long', // Hiển thị tên tháng đầy đủ ('tháng 10')
            year: 'numeric',
        };

        // 3. Sử dụng toLocaleString() với locale 'vi-VN' và options
        const formattedDatetime = dateToFormat.toLocaleString('vi-VN', options);

        // Kết quả toLocaleString() sẽ là: "00:00 Thứ Hai, 27 tháng Mười, 2025"
        // Ta cần điều chỉnh chuỗi này để khớp chính xác với định dạng mong muốn.

        // 4. Tùy chỉnh (Loại bỏ dấu phẩy và điều chỉnh viết hoa/viết thường)
        let finalFormat = formattedDatetime
            .replace(', ', ', ') // Giữ nguyên khoảng cách sau dấu phẩy (nếu có)
            .replace(/\s\s+/g, ' ') // Loại bỏ các khoảng trắng thừa
            .replace('Thứ Hai', 'Thứ 2') // toLocaleString thường trả về "Thứ Hai"
            .replace('tháng Mười', 'tháng 10') // toLocaleString có thể trả về tên tháng đầy đủ
            .replace(', ', ', '); // Loại bỏ dấu phẩy sau Thứ (nếu có)

        const dayOfWeek = dateToFormat.toLocaleDateString('vi-VN', { weekday: 'long' }).replace('Thứ Hai', 'Thứ 2');
        const day = dateToFormat.toLocaleDateString('vi-VN', { day: '2-digit' });
        const month = dateToFormat.toLocaleDateString('vi-VN', { month: 'long' });
        const year = dateToFormat.toLocaleDateString('vi-VN', { year: 'numeric' });
        const time = dateToFormat.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

        finalFormat = `${dayOfWeek}, ${day} ${month} năm ${year}`;

        dispatch({
            type: 'UPDATE_FIELD',
            field: 'datetime',
            payload: finalFormat,
        });
    }, []);

    return (
        <div className="h-full min-h-0 w-full border border-gray-200 bg-white p-5 rounded-[22px] flex flex-col gap-4 shadow-sm overflow-hidden">
            <div className="title-field flex shrink-0 items-start">
                <div className="flex-grow flex-col flex gap-2 min-w-0">
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        readOnly={readOnly}
                        placeholder="Nhập tiêu đề của thông báo"
                        className={`text-3xl 2xl:text-4xl w-full ring-0 outline-none font-semibold text-[#333333] leading-tight truncate ${readOnly ? 'cursor-default' : ''}`}
                    />
                    {formErrors.title && <p className="text-red-500 italic">*{formErrors.title}</p>}
                    <p className="text-[#333333]">{formData.datetime}</p>
                </div>
                <NotificationTypeSelect value={formData.type} onChange={handleChange} readOnly={readOnly} />
            </div>
            <div className="body flex min-h-0 flex-1">
                <Editor 
                    value={formData.body} 
                    onChange={handleQuillChange} 
                    zoom={zoom} 
                    setZoom={setZoom} 
                    characterCount={characterCount} 
                    contentError={formErrors.body} 
                    readOnly={readOnly}
                />
            </div>
            <div className="custom-scrollbar max-h-[110px] shrink-0 overflow-y-auto border-t border-slate-100 pt-3 pr-1">
                <MultipleFileUpload
                    currentFiles={attachments}
                    onUpload={onAttachmentsChange}
                    disabled={readOnly}
                    label="File đính kèm"
                />
            </div>
        </div>
    );
}

const CustomToolbar = ({ activeFormats, onCommand, zoom }) => {
    const btnClass = (active) =>
        `toolbar-btn h-7 w-7 flex items-center justify-center rounded duration-200 transition
         ${active ? "!bg-[#4E5BA6]/20" : "hover:!bg-gray-100"}`;

    return (
        <div id="custom-toolbar" className="flex flex-wrap gap-2 items-center p-2 border w-full rounded-xl bg-white border-gray-200" >
            <span className="flex p-0 gap-1">
                <button
                    className={btnClass(activeFormats.bold)}
                    data-command="bold"
                    onClick={(e) => onCommand("bold")}
                >
                    <Bold className="!h-full !w-full aspect-square" strokeWidth={2} />
                </button>
                <button
                    className={btnClass(activeFormats.italic)}
                    data-command="italic"
                    onClick={(e) => onCommand("italic")}
                >
                    <Italic className="!h-full !w-full aspect-square" strokeWidth={1.5} />
                </button>
                <button
                    className={btnClass(activeFormats.underline)}
                    data-command="underline"
                    onClick={(e) => onCommand("underline")}
                >
                    <Underline className="!h-full !w-full aspect-square" strokeWidth={1.5} />
                </button>
            </span>
            <span className="flex p-0 gap-1">
                <button
                    className={btnClass(activeFormats.link)}
                    data-command="link"
                    onClick={(e) => onCommand("link")}
                >
                    <Link className="!h-full !w-full aspect-square" strokeWidth={1.5} />
                </button>
                <button
                    className={btnClass(activeFormats.script === "sub")}
                    data-command="subscript"
                    onClick={(e) => onCommand("subscript")}
                >
                    <Subscript className="!h-full !w-full aspect-square" strokeWidth={1.5} />
                </button>
                <button
                    className={btnClass(activeFormats.script === "super")}
                    data-command="superscript"
                    onClick={(e) => onCommand("superscript")}
                >
                    <Superscript className="!h-full !w-full aspect-square" strokeWidth={1.5} />
                </button>
            </span>
            <span className="flex p-0 gap-1">
                <button
                    className={btnClass(!activeFormats.align)}
                    data-command="text-align-left"
                    onClick={(e) => onCommand("align-left")}
                >
                    <AlignLeft className="!h-full !w-full aspect-square" strokeWidth={1.5} />
                </button>
                <button
                    className={btnClass(activeFormats.align === "center")}
                    data-command="text-align-center"
                    onClick={(e) => onCommand("align-center")}
                >
                    <AlignCenter className="!h-full !w-full aspect-square" strokeWidth={1.5} />
                </button>
                <button
                    className={btnClass(activeFormats.align === "right")}
                    data-command="text-align-right"
                    onClick={(e) => onCommand("align-right")}
                >
                    <AlignRight className="!h-full !w-full aspect-square" strokeWidth={1.5} />
                </button>
                <button
                    className={btnClass(activeFormats.align === "justify")}
                    data-command="text-align-justify"
                    onClick={(e) => onCommand("align-justify")}
                >
                    <AlignJustify className="!h-full !w-full aspect-square" strokeWidth={1.5} />
                </button>
            </span>
            <span className="flex p-0 gap-1">
                <button
                    className={btnClass(activeFormats.list === "ordered")}
                    data-command="list-ordered"
                    onClick={(e) => onCommand("list-ordered")}
                >
                    <ListOrdered className="!h-full !w-full aspect-square" strokeWidth={1.5} />
                </button>
                <button
                    className={btnClass(activeFormats.list === "bullet")}
                    data-command="list-bullet"
                    onClick={(e) => onCommand("list")}
                >
                    <List className="!h-full !w-full aspect-square" strokeWidth={1.5} />
                </button>
            </span>
            <span className="flex p-0 gap-1">
                <button
                    className={btnClass(activeFormats.caselower)}
                    data-command="case-lower"
                    onClick={(e) => onCommand("case-lower")}
                >
                    <CaseLower className="!h-full !w-full aspect-square" strokeWidth={1.5} />
                </button>
                <button
                    className={btnClass(activeFormats.casesensitive)}
                    data-command="case-sensitive"
                    onClick={(e) => onCommand("case-sensitive")}
                >
                    <CaseSensitive className="!h-full !w-full aspect-square" strokeWidth={1.5} />
                </button>
                <button
                    className={btnClass(activeFormats.caseupper)}
                    data-command="case-upper"
                    onClick={(e) => onCommand("case-upper")}
                >
                    <CaseUpper className="!h-full !w-full aspect-square" strokeWidth={1.5} />
                </button>
            </span>
            <span className="flex p-0 gap-1 items-center">
                <span className="flex p-0 gap-1 items-center relative">
                    <button
                        className={btnClass(activeFormats.zoomin)}
                        onClick={() => onCommand("zoom-in")}
                    >
                        <ZoomIn className="!h-full !w-full aspect-square" strokeWidth={1.5} />
                    </button>

                    <AnimatePresence>
                        {zoom > 1.0 && (
                            <motion.p
                                key="zoom"
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.25 }}
                                className="text-sm text-gray-700 font-medium"
                            >
                                {Math.round(zoom * 100)}%
                            </motion.p>
                        )}
                    </AnimatePresence>

                    <button
                        className={btnClass(activeFormats.zoomout)}
                        onClick={() => onCommand("zoom-out")}
                    >
                        <ZoomOut className="!h-full !w-full aspect-square" strokeWidth={1.5} />
                    </button>
                </span>
            </span>
            <span className="flex p-0 gap-1">
                <button
                    className={btnClass(activeFormats.undo)}
                    data-command="undo"
                    onClick={(e) => onCommand("undo")}
                >
                    <Undo className="!h-full !w-full aspect-square" strokeWidth={1.5} />
                </button>
                <button
                    className={btnClass(activeFormats.redo)}
                    data-command="redo"
                    onClick={(e) => onCommand("redo")}
                >
                    <Redo className="!h-full !w-full aspect-square" strokeWidth={1.5} />
                </button>
            </span>
        </div >
    )
};

const Editor = ({ value, onChange, zoom, setZoom, characterCount = 0, contentError = '', readOnly }) => {
    const quillRef = useRef(null);
    const [activeFormats, setActiveFormats] = useState({});

    const modules = useMemo(() => {
        return {
            toolbar: readOnly ? false : { container: "#custom-toolbar" },
            history: { delay: 500, maxStack: 100, userOnly: true },
        };
    }, [readOnly]);

    useEffect(() => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;

        const updateActiveFormats = () => {
            const range = quill.getSelection();
            if (range) {
                const formats = quill.getFormat(range);
                setActiveFormats(formats);
            }
        };

        quill.on("selection-change", updateActiveFormats);
        quill.on("text-change", updateActiveFormats);

        return () => {
            quill.off("selection-change", updateActiveFormats);
            quill.off("text-change", updateActiveFormats);
        };
    }, []);

    const handleCommand = (command) => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;
        const editorEl = quill.root;

        const format = quill.getFormat();

        switch (command) {
            case "bold":
            case "italic":
            case "underline":
                quill.format(command, !format[command]);
                break;

            case "link":
                const existingLink = format.link;
                if (existingLink) {
                    quill.format("link", false);
                } else {
                    const url = prompt("Nhập đường dẫn liên kết:");
                    if (url) quill.format("link", url);
                }
                break;

            case "subscript":
                quill.format("script", format.script === "sub" ? false : "sub");
                break;

            case "superscript":
                quill.format("script", format.script === "super" ? false : "super");
                break;

            case "align-left":
                quill.format("align", "");
                break;
            case "align-center":
                quill.format("align", "center");
                break;
            case "align-right":
                quill.format("align", "right");
                break;
            case "align-justify":
                quill.format("align", "justify");
                break;

            case "list-ordered":
                quill.format("list", format.list === "ordered" ? false : "ordered");
                break;
            case "list":
                quill.format("list", format.list === "bullet" ? false : "bullet");
                break;

            case "undo":
                quill.history.undo();
                break;
            case "redo":
                quill.history.redo();
                break;
            case "zoom-in":
                {
                    const newZoom = Math.min(zoom + 0.1, 2);
                    editorEl.style.zoom = newZoom;
                    setZoom(newZoom);
                    break;
                }
            case "zoom-out":
                {
                    const newZoom = Math.max(zoom - 0.1, 0.5);
                    editorEl.style.zoom = newZoom;
                    setZoom(newZoom);
                    break;
                }
            case "case-upper":
            case "case-lower":
            case "case-sensitive": {
                const range = quill.getSelection();
                if (!range || range.length === 0) return;

                const text = quill.getText(range.index, range.length);
                let newText = text;

                if (command === "case-upper") newText = text.toUpperCase();
                else if (command === "case-lower") newText = text.toLowerCase();
                else if (command === "case-sensitive") newText = toggleCase(text);

                quill.deleteText(range.index, range.length);
                quill.insertText(range.index, newText, quill.getFormat());
                break;
            }

            default:
                break;
        }

        setActiveFormats(quill.getFormat());
    };

    return (
        <div className="overflow-hidden flex min-h-0 flex-1 flex-col gap-2">
            {!readOnly && <CustomToolbar activeFormats={activeFormats} onCommand={handleCommand} zoom={zoom} />}
            <ReactQuill
                key={readOnly ? "quill-readonly" : "quill-editable"}
                ref={quillRef}
                theme="snow"
                value={value}
                onChange={(val, _, __, editor) => {
                    if (readOnly) return;
                    onChange(editor);
                }}
                modules={modules}
                placeholder={readOnly ? "" : "Nhập nội dung tại đây"}
                readOnly={readOnly}
                className={`notification-editor !border-0 !p-0 flex-1 min-h-0 ${readOnly ? 'quill-read-only' : ''}`}
            />
            {contentError && <p className="text-red-500 italic">*{contentError}</p>}
            <span className="shrink-0 text-gray-400">
                {characterCount} ký tự
            </span>
        </div>
    );
}

export default CreateNotificationField
