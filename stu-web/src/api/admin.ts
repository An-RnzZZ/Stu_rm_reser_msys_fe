import request from '@/utils/request'

// ==================== 类型定义 ====================

export interface AdminLoginDTO {
adminAccount: string
adminPassword: string
}

export interface Admin {
adminId: number
adminName: string
adminAccount: string
}

export interface User {
userId: number
userName: string
userAccount: string
userPassword?: string
}

export interface Seat {
seatId: number
seatNumber: string
room?: {
roomId: number
roomName: string
}
}

export interface Reservation {
resvId: number
resvDate: string
resvstartTime: string
resvendTime: string
user?: User
seat?: Seat
}

export interface Sign {
signId: number
signinTime: string
signoutTime: string
signStatus: 'NORMAL' | 'LATE' | 'ABSENT' | 'MAKEUP'
user?: User
reservation?: Reservation
}

export interface ResponseMessage<T> {
code: number
message: string
data: T
}

// ==================== 管理员认证 ====================

// 管理员登录
export function adminLogin(data: AdminLoginDTO) {
  return request.post<ResponseMessage<Admin>>('/admin/login', data)
}

// 获取管理员信息
export function getAdminById(adminId: number) {
  return request.get<ResponseMessage<Admin>>(`/admin/${adminId}`)
}

// ==================== 用户管理 ====================

// 获取所有用户
export function getAllUsers() {
  return request.get<ResponseMessage<User[]>>('/admin/users')
}

// 获取单个用户
export function getUserById(userId: number) {
  return request.get<ResponseMessage<User>>(`/admin/users/${userId}`)
}

// 更新用户信息
export function updateUser(userId: number, data: { userName?: string; userAccount?: string }) {
  return request.put<ResponseMessage<User>>(`/admin/users/${userId}`, data)
}

// 删除用户
export function deleteUser(userId: number) {
  return request.delete<ResponseMessage<void>>(`/admin/users/${userId}`)
}

// ==================== 座位管理 ====================

// 获取所有座位
export function getAllSeats() {
  return request.get<ResponseMessage<Seat[]>>('/admin/seats')
}

// ==================== 预约管理 ====================

// 获取所有预约
export function getAllReservations() {
  return request.get<ResponseMessage<Reservation[]>>('/admin/reservations')
}

// 按用户ID获取预约
export function getReservationsByUserId(userId: number) {
  return request.get<ResponseMessage<Reservation[]>>(`/admin/reservations/user/${userId}`)
}

// 按日期获取预约
export function getReservationsByDate(date: string) {
  return request.get<ResponseMessage<Reservation[]>>(`/admin/reservations/date/${date}`)
}

// ==================== 签到管理 ====================

// 获取所有签到记录
export function getAllSigns() {
  return request.get<ResponseMessage<Sign[]>>('/admin/signs')
}

// 按用户ID获取签到记录
export function getSignsByUserId(userId: number) {
  return request.get<ResponseMessage<Sign[]>>(`/admin/signs/user/${userId}`)
}

// 按状态获取签到记录
export function getSignsByStatus(status: string) {
  return request.get<ResponseMessage<Sign[]>>(`/admin/signs/status/${status}`)
}
