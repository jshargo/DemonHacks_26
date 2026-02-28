// User profile screen
// Owner: Person 1 (Auth + Profiles)

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuthStore } from '@/stores/auth-store';

export default function ProfileScreen() {
  const { session, profile, signOut } = useAuthStore();

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {profile?.display_name?.[0]?.toUpperCase() ??
            profile?.username?.[0]?.toUpperCase() ??
            session?.user?.email?.[0]?.toUpperCase() ??
            '?'}
        </Text>
      </View>

      <Text style={styles.name}>
        {profile?.display_name ?? profile?.username ?? 'Explorer'}
      </Text>
      {profile?.username && (
        <Text style={styles.username}>@{profile.username}</Text>
      )}
      <Text style={styles.email}>{session?.user?.email ?? ''}</Text>

      {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

      <Pressable style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', backgroundColor: '#fff', paddingTop: 60 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: 'bold' },
  username: { fontSize: 14, color: '#999', marginTop: 2 },
  email: { fontSize: 14, color: '#666', marginTop: 4 },
  bio: { fontSize: 14, color: '#555', marginTop: 12, textAlign: 'center', maxWidth: 280 },
  signOut: {
    marginTop: 40,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  signOutText: { color: '#e74c3c', fontWeight: '600', fontSize: 15 },
});
