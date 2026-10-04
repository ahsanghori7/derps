"use client"

import { useEffect, useState } from "react"
import MultiSelectDropdown from "@components/MultiSelectDropdown"
import { getChats } from "../../api/chatApi"

// `value`/`onChange` deal in plain chat group ids (matches the `chatGroupIds`
// field the meeting API expects) — the full group objects (needed for the
// dropdown's labels/checkboxes) are resolved internally once they've loaded.
const GroupPicker = ({ accessToken, value = [], onChange, error }) => {
    const [groups, setGroups] = useState([]);

    useEffect(() => {
        if (!accessToken) return;
        getChats(accessToken, 1, 100)
            .then((response) => {
                const chats = Array.isArray(response?.data) ? response.data : [];
                setGroups(chats.filter((chat) => chat.type === 'group'));
            })
            .catch(() => {
                setGroups([]);
            });
    }, [accessToken]);

    const selectedGroups = groups.filter((group) => value.includes(group.id));

    return (
        <MultiSelectDropdown
            menuItems={groups}
            selectedValue={selectedGroups}
            onChange={(items) => onChange(items.map((item) => item.id))}
            defaultText="--select chat groups (optional)--"
            error={error}
            eventScreen={true}
        />
    );
};

export default GroupPicker;
