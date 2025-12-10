import request from '@/utils/request'

export interface CreateReservationPayload {
  seatId: number
  userId: number
  resvDate: string // YYYY-MM-DD
  resvStart: string // HH:mm
  resvEnd: string // HH:mm
  resvtimeSignin?: number // milliseconds since epoch
  resvtimeSignout?: number // milliseconds since epoch
  remark?: string
}

export function createReservation(payload: CreateReservationPayload) {
  return request.post('/reservation', payload)
}

export function deleteReservation(resvId: number) {
  return request.delete(`/reservation/${resvId}`)
}
