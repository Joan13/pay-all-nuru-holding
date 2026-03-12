export type TStore = {
    selected: number,
    modal_app: boolean,
}

export type TPersistedApp = {
    user_data: TUserData,
    theme: string,
    language: string
}

export type TUserData = {
    _id: string,
    names: string,
    gender: number,
    country: string,
    city: string,
    state: string,
    address: string,
    phone_numbers: string[], // Phone numbers array
    user_email: string, // Primary email (backward compatibility)
    user_emails?: string[], // Multiple emails
    user_password: string,
    profile_picture: string,
    account_type: number,
    is_admin?: boolean, // Admin flag
    car_model?: string, // Car model (for drivers)
    car_condition?: number, // Car condition: 0 = excellent, 1 = good/fair, 2 = poor/scrap (for drivers)
    license_plate?: string, // License plate number (for drivers)
    createdAt: string,
    updatedAt: string
}

export type TRide = {
    _id: string,
    user_id: string,
    driver_id: string,
    start_location: string,
    end_location: string,
    stops: {
        address: string,
        latitude: number,
        longitude: number
    }[],
    start_time: string,
    end_time: string,
    distance: number,
    city: string,
    estimated_duration: number,
    ride_status: number,
    ride_type: number,
    ride_price: number,
    ride_currency: number,
    ride_payment_method: number,
    ride_payment_status: number,
    ride_payment_date: string,
    ride_payment_amount: number,
    ride_payment_currency: number,
    createdAt: string,
    updatedAt: string
}

