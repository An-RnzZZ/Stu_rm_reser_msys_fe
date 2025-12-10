// 自习室类型
export interface StudyRoom {
  id: number
  name: string
  capacity: number
  availableSeats: number
  location: string
  status: '可用' | '满员' | '维护中'
  equipment?: string[]
  description?: string
}

// 自习室管理类型
export interface StudyRoomForManagement {
  id: number
  name: string
  location: string
  capacity: number
  availableSeats: number
  status: 'available' | 'maintenance' | 'closed'
  equipment: string[]
  description: string
}

// 预约记录类型
export interface Reservation {
  id: number
  roomName: string
  date: Date
  timeSlot: string
  seatNumber: string
  status: 'RESERVED' | 'IN_USE' | 'COMPLETED' | 'CANCELLED'
  remark?: string
  createTime: Date
}

// 预约表单类型
export interface ReservationForm {
  date: string
  startTime: string
  endTime: string
  roomId: string
  remark: string
}
