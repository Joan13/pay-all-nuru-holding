# Backend API Requirements for Driver Features

## Overview
This document outlines the backend API changes required to support the new driver features in the frontend.

## 1. Get Rides API (`/payall/API/get_rides`)

### Current Behavior
- Returns rides for a specific user based on `user_id`

### Required Changes

#### For History (User's Own Rides)
**Request:**
```json
{
  "user_id": "user_id_here"
}
```

**Expected Response:**
- Return all rides where `user_id` matches the requesting user
- This applies to both regular users AND drivers (drivers are also users)
- Drivers should see their own rides in history, not all available rides

#### For Rides Section (Available Rides for Drivers)
**Request:**
```json
{
  "user_id": "driver_user_id",
  "city": "city_name",
  "available_only": true,
  "driver_view": true
}
```

**Expected Response:**
- Return rides in the specified `city` that:
  - Have `ride_status` NOT equal to 3 (completed) or 4 (cancelled)
  - Are available for drivers to accept (status 0, 1, or 2)
  - Filter by city matching the `city` parameter
- Only return rides if the requesting user is a driver (`account_type === 1`)

**Response Format:**
```json
{
  "success": "1",
  "rides": [
    {
      "_id": "ride_id",
      "user_id": "user_id",
      "driver_id": "",
      "start_location": "address",
      "end_location": "address",
      "stops": [],
      "start_time": "ISO_date_string",
      "end_time": "",
      "distance": 5.2,
      "city": "city_name",
      "estimated_duration": 15,
      "ride_status": 0,
      "ride_type": 0,
      "ride_price": 5000,
      "ride_currency": 0,
      "ride_payment_method": 0,
      "ride_payment_status": 0,
      "ride_payment_date": "",
      "ride_payment_amount": 0,
      "ride_payment_currency": 0,
      "createdAt": "ISO_date_string",
      "updatedAt": "ISO_date_string"
    }
  ]
}
```

## 2. Update Ride API (`/payall/API/update_ride`)

### Current Behavior
- Updates ride information based on `ride_id`

### Required Changes

#### Driver Status Updates
**Request:**
```json
{
  "ride_id": "ride_id_here",
  "ride": {
    "ride_status": 1  // 0=pending, 1=accepted, 2=in progress, 3=completed, 4=cancelled
  }
}
```

**Authorization:**
- Only allow status updates if:
  - The requesting user is the driver assigned to the ride (`driver_id` matches), OR
  - The requesting user is an admin (`account_type === 2`)
- Do not allow status updates if ride is completed (status 3) or cancelled (status 4)

#### Driver Price Setting (Manual Rides)
**Request:**
```json
{
  "ride_id": "ride_id_here",
  "ride": {
    "ride_price": 5000
  }
}
```

**Authorization:**
- Only allow price updates if:
  - The requesting user is the driver assigned to the ride (`driver_id` matches)
  - The ride status is 1 (accepted) or 2 (in progress)
  - This is for manual rides where price needs to be set by the driver

**Validation:**
- Ensure `ride_price` is a positive number
- Ensure `ride_price` is greater than 0

**Response Format:**
```json
{
  "success": "1",
  "ride": {
    // Updated ride object
  }
}
```

## 3. Implementation Notes

### Account Types
- `account_type: 0` = Regular user
- `account_type: 1` = Driver (can also be a regular user)
- `account_type: 2` = Admin

### Ride Status Values
- `0` = Pending (waiting for driver)
- `1` = Accepted (driver has accepted)
- `2` = In Progress (ride is ongoing)
- `3` = Completed
- `4` = Cancelled

### Key Points
1. **Drivers are users first**: When a driver calls `get_rides` without `driver_view: true`, they should receive their own rides (as a user), not all available rides.

2. **Driver view**: The `driver_view: true` parameter indicates the driver wants to see available rides in their city, not their own rides.

3. **City filtering**: When `driver_view: true` is set, filter rides by the `city` parameter.

4. **Status filtering**: When `available_only: true` is set, exclude rides with status 3 (completed) or 4 (cancelled).

5. **Price setting**: Drivers can only set prices for rides they are assigned to, and only when the ride is accepted or in progress.

6. **Status updates**: Drivers can update status for rides they are assigned to, except for completed/cancelled rides.

## 4. Security Considerations

1. **Authentication**: Ensure all API calls are authenticated
2. **Authorization**: Verify user permissions before allowing updates
3. **Validation**: Validate all input data (price must be positive, status must be valid, etc.)
4. **City matching**: Ensure city parameter is properly validated and sanitized

## 5. Error Responses

**Invalid Request:**
```json
{
  "success": "0",
  "error": "Invalid request parameters"
}
```

**Unauthorized:**
```json
{
  "success": "0",
  "error": "You are not authorized to perform this action"
}
```

**Not Found:**
```json
{
  "success": "0",
  "error": "Ride not found"
}
```

