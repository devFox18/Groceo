import { Alert } from 'react-native';

export function toast(message: string, title = 'Groceo') {
  Alert.alert(title, message);
}
