import { TStore } from '@/src/Types';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../app/store';
// import { TBusinessBadge, TContact, TSelection, TStore, TUser } from '../../types/types';
// import { strings } from '../../lang/lang';
// import { NavigationProp } from '@react-navigation/native';
// import { useRef } from 'react';

const initialState: TStore = {
    selected: 0,
    modal_app: false,
}

export const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        setSelected: (state, action: PayloadAction<number>) => {
            state.selected = action.payload;
        },
        setShowModalApp: (state, action: PayloadAction<boolean>) => {
            state.modal_app = action.payload;
        },
        // setMessageSelected: (state, action: PayloadAction<string>) => {
        //     if (state.message_selected === action.payload) {
        //         state.message_selected = "";
        //     } else {
        //         state.message_selected = action.payload;
        //     }
        // },
        // setLoading: (state, action: PayloadAction<boolean>) => {
        //     state.loading = action.payload;
        // },
        // setShowFavoriteChats: (state, action: PayloadAction<boolean>) => {
        //     state.show_favorite_chats = action.payload;
        // },
        // setTextBusinessSearch: (state, action: PayloadAction<string>) => {
        //     state.text_business_search = action.payload;
        // },
        // setShowCustomKeyboard: (state, action: PayloadAction<boolean>) => {
        //     state.show_custom_keyboard = action.payload;
        // },
        // setPlayingVoiceNote: (state, action: PayloadAction<boolean>) => {
        //     state.playing_voice_note = action.payload;
        // },
        // setRecordingAudio: (state, action: PayloadAction<boolean>) => {
        //     state.recordingAudio = action.payload;
        // },
        // setPlayingRecorded: (state, action: PayloadAction<boolean>) => {
        //     state.playingRecorded = action.payload;
        // },
        // setLoadingButton: (state, action: PayloadAction<boolean>) => {
        //     state.loading_button = action.payload;
        // },
        // setShowModalApp: (state, action: PayloadAction<boolean>) => {
        //     state.modal_app = action.payload;
        // },
        // setTitle: (state, action: PayloadAction<string>) => {
        //     state.title = action.payload;
        // },
        // setSearchContactEnabled: (state, action: PayloadAction<boolean>) => {
        //     state.search_contact_enabled = action.payload;
        // },
        // setCurrentUser: (state, action: PayloadAction<string>) => {
        //     state.current_user = action.payload;
        // },
        // setSearchYambiEnabled: (state, action: PayloadAction<boolean>) => {
        //     state.search_yambi = action.payload;
        // },
        // setSearchYambiText: (state, action: PayloadAction<string>) => {
        //     state.search_yambi_text = action.payload;
        // },
        // setRawContacts: (state, action: PayloadAction<TContact[]>) => {
        //     action.payload.map((item, index) => (
        //         state.raw_contacts[index] = item
        //     ))
        // },
        // setContactsSelected: (state, action: PayloadAction<TUser>) => {
            // state.contacts_selected = [...state.contacts_selected, action.payload]
            // state.contacts_selected = state.contacts_selected.push(action.payload);
        // },
        // setType_contact: (state, action: PayloadAction<number>) => {
        //     state.type_contact = action.payload;
        // },
        // setMessageInbox: (state, action: PayloadAction<string>) => {
        //     state.message_inbox = action.payload;
        // },
        // setResponseTo: (state, action: PayloadAction<string>) => {
        //     state.response_to = action.payload;
        // },
        // setTitleApp: (state, action: PayloadAction<string>) => {
        //     state.title = action.payload;
        // },
        // setTextContactSearch: (state, action: PayloadAction<string>) => {
        //     state.text_contact_search = action.payload;
        // },
        // setSelection: (state, action: PayloadAction<TSelection>) => {
        //     state.selection = action.payload;
        // },
        // setEmoji: (state, action: PayloadAction<string>) => {
        //     state.inputEmoji = action.payload;
        // },
        // setBusinessOpened: (state, action: PayloadAction<boolean>) => {
        //     state.business_opened = action.payload;
        // },
        // setVoiceNoteBeingPlayed: (state, action: PayloadAction<string>) => {
        //     state.voice_note_being_played = action.payload;
        // },
        // setPhoneNumbersList: (state, action: PayloadAction<string>) => {

        //     const list = state.phone_numbers_list.filter(item => item === action.payload);

        //     if (action.payload === "") {
        //         state.phone_numbers_list = [];
        //     } else {
        //         if (list.length === 0) {
        //             state.phone_numbers_list.push(action.payload);
        //         } else {
        //             const llist2 = state.phone_numbers_list.filter(item => item !== action.payload);
        //             state.phone_numbers_list = llist2;
        //         }
        //     }
        // },
        // setBusinessBadge: (state, action: PayloadAction<TBusinessBadge[]>) => {
        //     state.business_badge = action.payload;
        // },
        // setAddBusinessBadge: (state, action: PayloadAction<TBusinessBadge>) => {
        //     state.business_badge.push(action.payload);
        // },
        // setRemoveBusinessBadge: (state, action: PayloadAction<string>) => {
        //     state.business_badge = state.business_badge.filter(el => el.business_id !== action.payload);
        // },
        // setRemoveSalesPointBadge: (state, action: PayloadAction<string>) => {
        //     state.business_badge = state.business_badge.filter(el => el.sales_point_id !== action.payload);
        // },
        // setRemoveChatBadge: (state, action: PayloadAction<string>) => {
        //     state.chats_badge = state.chats_badge.filter(el => el !== action.payload);
        // },
        // setAddChatBadge: (state, action: PayloadAction<string>) => {
        //     if (!state.chats_badge.includes(action.payload)) {
        //         state.chats_badge.push(action.payload);
        //     }
        // },
        // setBusinessItemsFilter: (state, action: PayloadAction<string>) => {
        //     state.business_items_filter = action.payload;
        // },
        // setUserConnected: (state, action: PayloadAction<string>) => {
        //     const user_connected = state.users_connected.find(element => element === action.payload);

        //     if (user_connected === undefined) {
        //         state.users_connected.push(action.payload);
        //     }
        // },
        // setCategory: (state, action: PayloadAction<string>) => {
        //     state.category = action.payload;
        // },
    }
})

export const {
    setSelected,
    setShowModalApp,
} = appSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectApp = (state: RootState) => state.app;

export default appSlice.reducer;
