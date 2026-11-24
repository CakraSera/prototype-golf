import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, Text, TextInput, View, type TextInputInstance } from 'react-native';

import { colors } from '../../theme';
import { Heading } from '../practice/controls';
import { articleGroups, filterArticles } from './articles';
import { FlightThumbnail, GuideIcon } from './illustrations';

export function KnowledgeScreen() {
  const [query, setQuery] = useState('');
  const input = useRef<TextInputInstance>(null);
  const articles = filterArticles(query);
  const searchStatus = !query.trim() ? '' : !articles.length
    ? 'No articles found. Try another search.'
    : articles.length === 1 ? '1 article found' : `${articles.length} articles found`;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ width: '100%', maxWidth: 576, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 20 }}
    >
      <Heading>Knowledge</Heading>
      <View className="gap-2">
        <View className="min-h-12 flex-row items-center gap-2 rounded-xl border border-border bg-surface pl-3">
          <GuideIcon name="search" />
          <TextInput
            ref={input}
            accessibilityLabel="Search articles"
            placeholder="Search articles"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="search"
            className="min-h-12 min-w-0 flex-1 py-2 pr-3 text-base text-foreground"
            value={query}
            onChangeText={setQuery}
          />
          {query !== '' && <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            className="min-h-11 min-w-11 items-center justify-center rounded-lg active:opacity-60"
            onPress={() => {
              setQuery('');
              input.current?.focus();
            }}
          >
            <GuideIcon name="close" />
          </Pressable>}
        </View>
        <Text accessibilityLiveRegion="polite" className={searchStatus ? 'text-sm text-muted-foreground' : 'h-0'}>
          {searchStatus}
        </Text>
      </View>
      {articleGroups.map(group => {
        const rows = articles.filter(article => article.group === group);
        if (!rows.length) return null;
        return <View className="gap-2" key={group}>
          <Text accessibilityRole="header" className="text-base font-semibold text-foreground">{group}</Text>
          <View className="overflow-hidden rounded-xl border border-border bg-surface">
            {rows.map((article, index) => (
              <Link
                asChild
                push
                key={article.id}
                href={{ pathname: '/knowledge/[id]', params: { id: article.id } }}
              >
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={article.title}
                  accessibilityHint={article.summary}
                  onPress={Keyboard.dismiss}
                  className={`min-h-[76px] flex-row items-center gap-3 px-3 py-3 active:bg-primary/15 ${index ? 'border-t border-border' : ''}`}
                >
                  <View className="size-10 items-center justify-center rounded-lg bg-primary/15">
                    {article.symbol === 'flag' || article.symbol === 'history'
                      ? <GuideIcon name={article.symbol} />
                      : <FlightThumbnail kind={article.symbol} size={32} />}
                  </View>
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-base font-semibold text-foreground">{article.title}</Text>
                    <Text className="text-sm text-muted-foreground">{article.summary}</Text>
                  </View>
                </Pressable>
              </Link>
            ))}
          </View>
        </View>;
      })}
    </ScrollView>
  );
}
