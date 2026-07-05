import { useState } from 'react'
import { LAST_ORDER_STORAGE_KEY } from './useCreateOrder'

export function useLastOrderId() {
  const [lastOrderId] = useState(() => localStorage.getItem(LAST_ORDER_STORAGE_KEY))
  return lastOrderId
}
