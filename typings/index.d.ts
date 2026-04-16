import VCard, { Property } from 'vcfer'
import * as React from 'react'
import { User } from 'firebase'

// these are how the data is stored in the server
declare global {
	type UserDocument = {
		stripeCustomerId: string
		ownedClubs: { [id: string]: string }
	}

	type MemberDocument = {
		card: string
		editUrl: string
		email: string
		owner: string
	}

	type MemberSortInfo = {
		email?: string
		error: string
		name: string
		org: string
	}

	type ClubDocument = {
		name: string
		owner: string
		passwordEnabled: boolean
		passwordSet: boolean
		status: 'paid' | 'unpaid'
		memberList: { [id: string]: MemberSortInfo }
	}

	// these are post-processed clientside

	type UserDocumentWithId = UserDocument & {
		uid: string
	}

	type MemberDocumentWithId = MemberDocument & {
		id: string
	}

	type SortedMemberSortInfo = MemberSortInfo & {
		id: string
	}

	type SortedMemberLists = {
		complete:
			| { [letter: string]: SortedMemberSortInfo[] } // unfiltered
			| SortedMemberSortInfo[] // filtered
		incomplete: SortedMemberSortInfo[]
		blank: SortedMemberSortInfo[]
		filtered: boolean
	}

	type SortedClubDocument = ClubDocument & {
		sortedLists: SortedMemberLists
	}

	type UploadMemberImageFxn = (
		file: File,
		owner: string,
		clubId: string,
		memberId: string
	) => Promise<object>

	type DeleteMemberImageFxn = (
		clubId: string,
		memberId: string
	) => Promise<object>

	interface IMemberDisplayContext {
		filter: boolean
		setFilter: (filter: boolean) => void
		loading: boolean
		sortedLists: SortedMemberLists
		selectedMember: string
		setSelectedMember: any
		reloadSelectedMember: any
		onSelectMember: any
		onDeselectMember: any
		showIncomplete: boolean
		loadMember: any
		updateMember: any
		clubId: string
		basePath: string
		emptyComponent: any
		addBlankMember: () => Promise<any>
		adding: boolean
	}

	interface IEditMemberContext {
		updateMember: () => void
		deleteMember: () => void
		member: MemberDocumentWithId
		card: VCard
		setCard: any
		clubId: string
		forceUpdateEditMember: () => void
		isIncomplete: boolean
		updateIncomplete: () => void
		isBlank: () => boolean
		uploadMemberImage: UploadMemberImageFxn
		deleteMemberImage: DeleteMemberImageFxn
	}

	interface IEditMemberPropertyContext {
		prop: Property
		handlePropChange: (
			prop: Property,
			semicolonIndex?: number
		) => (e?: InputEvent) => void
		handlePropChangeGeneric: (
			updateMember: Function,
			prop: Property,
			modifier: (str: string) => string,
			semicolonIndex?: number
		) => (e?: InputEvent) => void
		setConfirmDelete: React.Dispatch<React.SetStateAction<boolean>>
	}

	interface IAppContext {
		userDoc: UserDocumentWithId
		loading: boolean
		error?: Error
		clubNameForId: (id: string) => string
	}

	interface IAuthContext {
		user: firebase.User
		loadingUser: boolean
		signInGoogle: () => Promise<any>
		registerEmail: (email: string, password: string) => Promise<any>
		signInEmail: (email: string, password: string) => Promise<any>
		signOut: () => Promise<void>
	}

	interface IVisitorContext {
		clubUrl: string
		token: string
		requestToken: (pass: string) => Promise<boolean>
		authenticated: boolean
		clubApiCall: (method: string, url: string, body: object) => Promise<object>
		useApiData: (
			url: string
		) => [object | undefined, boolean, Error | undefined]
		joiningWithoutPass: boolean
	}

	type PropFormComponent = React.FC<{
		/** this is fluid */
		fluid: boolean
		/**
		 * Placeholder text for the string.
		 */
		placeholder: string
		/** for multi-part fields like name fields that are separated by
		 * semicolons, this selects which semicolon to start after.
		 */
		semicolonIndex?: number
	}>

	type PropForm = {
		/**
		 * Display name for the Property
		 */
		name: string
		component: PropFormComponent
		/**
		 * for properties like Title where you can only have one.
		 * Disables the Add button after you create just one of them.
		 */
		isSingleton: boolean
	}
}

export {}
