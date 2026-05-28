import { useState } from "react";
import clsx from "clsx"
import { Search } from "lucide-react"



const SearchableSelect = ({
    value,
    onChange,
    placeholder,
    options,
    optionKey = "id",
    optionLabel = "name",
    optionStatus = "status", // nếu có status
    disabled = false
}) => {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);

    const filteredList = Array.isArray(options)
        ? options.filter((opt) =>
            opt?.[optionLabel]?.toLowerCase().includes(search.toLowerCase())
        )
        : [];

    return (
        <div className="relative">
            {/* Nút hiển thị giá trị đã chọn */}
            <button
                type="button"
                className={clsx(
                    "w-full ring-1 ring-gray-300 rounded-xl p-3 bg-white cursor-pointer flex justify-between items-center",
                    open && "ring-1 !ring-[#4E5BA6]", disabled && "!cursor-not-allowed !bg-gray-200"
                )}
                onClick={() => !disabled && setOpen(!open)}
            >
                <span className={value ? "text-gray-700" : "text-gray-500"}>
                    {value
                        ? options.find((opt) => opt[optionKey] === value)?.[optionLabel]
                        : placeholder || "Chọn"}
                </span>
                <span className="text-gray-400">▼</span>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute mt-1.5 w-full z-10">
                    {/* Ô tìm kiếm */}
                    <div className="bg-white border flex items-center px-2 text-gray-400 border-gray-200 rounded-xl shadow-lg">
                        <Search />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Tìm kiếm"
                            className="w-full p-2 outline-none rounded-t-xl"
                            required={true}
                        />
                    </div>

                    {/* Danh sách option */}
                    <div className="bg-white border border-gray-200 rounded-xl mt-1 shadow-lg max-h-40 overflow-hidden">
                        <ul className="max-h-40 overflow-y-auto">
                            {filteredList.length > 0 ? (
                                filteredList.map((opt) => (
                                    <li
                                        key={opt[optionKey]}
                                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-gray-700 flex gap-2 items-center"
                                        onClick={() => {
                                            onChange(opt);
                                            setOpen(false);
                                            setSearch("");
                                        }}
                                    >
                                        {opt[optionLabel]}
                                        {opt[optionStatus] === "active" && (
                                            <div className="bg-green-400 size-2 rounded-2xl text-xs"></div>
                                        )}
                                        {opt[optionStatus] === "off" && (
                                            <span className="bg-red-500 size-2 rounded-2xl text-xs"></span>
                                        )}
                                    </li>
                                ))
                            ) : (
                                <li className="px-3 py-2 text-gray-400 text-sm">
                                    Không tìm thấy
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
