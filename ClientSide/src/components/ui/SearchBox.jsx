import { IoSearchOutline } from "react-icons/io5";
import { useState, useMemo, useEffect } from "react";
import debounce from "lodash.debounce";

const SearchIcon = ({ className = "" }) => <IoSearchOutline className={className} />;

const SearchBox = ({
    placeholder = "Tìm kiếm...",
    description,
    onSearch = () => { },
    debounceDelay = 300,
    defaultValue = "",
    // control từ ngoài:
    rootClassName = "",   // set width/position cho cả khối (vd: "w-[420px]" hoặc "w-full md:w-[420px]")
    className = "",       // style cho khung input
    inputClassName = "",  // style riêng cho <input>
    autoFocus = false,
}) => {
    const [query, setQuery] = useState(defaultValue);

    const debouncedSearch = useMemo(
        () => debounce((q) => onSearch(q), debounceDelay),
        [onSearch, debounceDelay]
    );

    useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

    const handleChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        debouncedSearch(val);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            debouncedSearch.cancel();
            onSearch(query.trim());
        }
    };

    const handleClear = () => {
        setQuery("");
        debouncedSearch.cancel();
        onSearch("");
    };

    return (
        <div className={`w-full ${rootClassName}`}>
            <div
                className={`
          flex items-center h-9 w-full px-4 gap-2
          bg-white border border-gray-300 rounded-2xl
          hover:border-[#4E5BA6]
          focus-within:border-[#4E5BA6]
          ${className}
        `}
                role="search"
            >
                <SearchIcon className="w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    value={query}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    className={`
            w-full h-full text-[14px] text-gray-700 placeholder-gray-400
            bg-transparent outline-none
            ${inputClassName}
          `}
                    aria-label="Search"
                />
                {query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="text-gray-400 hover:text-gray-600 transition"
                        aria-label="Clear search"
                        title="Xóa"
                    >
                        ×
                    </button>
                )}
            </div>

            {description && (
                <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
        </div>
    );
};

export default SearchBox;
