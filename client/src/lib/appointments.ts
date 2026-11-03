import { App } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from './api'
import i18n from '../i18n'

// All appointment queries start with ['appointments'], so one invalidate refreshes lists and stats.
export const PAGE_SIZE = 10
// Same rule as the API: a patient can have at most this many upcoming appointments.
export const MAX_UPCOMING_BOOKINGS = 3

function useRefresh() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] })
    queryClient.invalidateQueries({ queryKey: ['availability'] }) // a cancelled slot is free again
  }
}

export function useCancelAppointment() {
  const { message } = App.useApp()
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/appointments/${id}/cancel`),
    onSuccess: () => {
      message.success(i18n.t('myAppointments.cancelled'))
      refresh()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })
}

export function useUpdateAppointmentStatus() {
  const { message } = App.useApp()
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'COMPLETED' | 'NO_SHOW' }) =>
      api.patch(`/appointments/${id}/status`, { status }),
    onSuccess: () => {
      message.success(i18n.t('myAppointments.statusUpdated'))
      refresh()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })
}
