import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'moodlit.featureIntroSeen.v1';

type Status = 'loading' | 'unseen' | 'seen';

export function useFeatureIntroFlag() {
	const [status, setStatus] = useState<Status>('loading');

	useEffect(() => {
		AsyncStorage.getItem(KEY)
			.then(value => setStatus(value === '1' ? 'seen' : 'unseen'))
			.catch(() => setStatus('unseen'));
	}, []);

	const markSeen = useCallback(async () => {
		setStatus('seen');
		try {
			await AsyncStorage.setItem(KEY, '1');
		} catch {}
	}, []);

	return { status, markSeen };
}
