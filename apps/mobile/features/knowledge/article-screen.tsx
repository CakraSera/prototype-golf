import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigationState } from 'expo-router/react-navigation';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Action, Back, Heading } from '../practice/controls';
import { findArticle } from './articles';
import { FlightThumbnail } from './illustrations';

export function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const article = findArticle(id);
  const router = useRouter();
  const hasStackBack = useNavigationState(state => state.index > 0);
  const { bottom } = useSafeAreaInsets();
  const toProgress = article?.destination === 'progress';

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ width: '100%', maxWidth: 576, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: bottom + 32, gap: 16 }}
    >
      {!hasStackBack && <Back label="All articles" onPress={() => router.replace('/knowledge')} />}
      {article ? <>
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{article.group}</Text>
          <Heading>{article.title}</Heading>
        </View>
        <Text selectable className="text-base leading-7 text-foreground">{article.paragraphs[0]}</Text>
        {article.paths && <View className="flex-row flex-wrap gap-2">
          {article.paths.map(({ kind, caption }) => <View key={kind} className="flex-1 basis-28 items-center gap-2 rounded-lg border border-border px-3 py-2">
            <FlightThumbnail kind={kind} size={64} />
            <Text className="text-center text-sm text-foreground">{caption}</Text>
          </View>)}
        </View>}
        <Text selectable className="text-base leading-7 text-foreground">{article.paragraphs[1]}</Text>
        <View className="gap-1 rounded-lg border-l-2 border-secondary bg-primary/15 px-4 py-3">
          <Text accessibilityRole="header" className="text-base font-semibold text-foreground">Try it</Text>
          <Text selectable className="text-base leading-7 text-foreground">{article.tryIt}</Text>
        </View>
        <Action
          secondary
          label={toProgress ? 'View my skill stats' : 'Go to Today'}
          onPress={() => router.dismissTo(toProgress ? '/progress' : '/')}
        />
      </> : <>
        <Heading>Article not found</Heading>
        <Text className="text-base leading-7 text-muted-foreground">Return to Knowledge to choose another article.</Text>
      </>}
    </ScrollView>
  );
}
