export const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null
export const setToken = (token: string) => localStorage.setItem('token', token)
export const removeToken = () => localStorage.removeItem('token')
export const getUser = () => {
  if (typeof window === 'undefined') return null
  const u = localStorage.getItem('user')
  return u ? JSON.parse(u) : null
}
export const setUser = (user: any) => localStorage.setItem('user', JSON.stringify(user))
export const removeUser = () => localStorage.removeItem('user')
export const logout = () => { removeToken(); removeUser(); window.location.href = '/login' }
