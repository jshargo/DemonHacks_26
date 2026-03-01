import { View, StyleSheet } from 'react-native';
import SearchBar from './SearchBar';
import CategoryStrip from './CategoryStrip';

export default function TopBar() {
  return (
    <View style={styles.container}>
      <SearchBar />
      <CategoryStrip />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
