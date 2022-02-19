package com.hvn.game.wordle;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Random;

public class WordBank {
	List<Word5> wordList;
	
	public WordBank(String filepath) throws Exception {
		wordList = WordleHelper.convert(WordleHelper.loadFile(filepath));
	}

	public Word5 nextGuess() {
		return nextGuess(false);
	}
	
	public Word5 nextGuess(boolean uniqueAlphabet) {
		if (wordList.size() == 0)
			return null;
		
		Random r = new Random(new Date().getTime());
		int indx = r.nextInt(wordList.size());
		
		if (!uniqueAlphabet) {
			return wordList.get(indx);
		}
		
		int i = 0;
		for (Word5 word5 : wordList) {
			if (i++ < indx)
				continue;
			
			if (word5.uniqueAlphabet())
				return word5;
		}
		
		System.out.println("==\nUnique word not found\n==");
		return nextGuess(false);
	}


	public void reduce(WordReducerPredicate predicate) {
		List<Word5> newList = new ArrayList<Word5>();
		
		for (Word5 word : wordList) {
			if (predicate.pass(word))
				newList.add(word);
		}

		wordList = newList;
	}

	public boolean isEmpty() {
		return (wordList == null) || wordList.isEmpty();
	}

	public void reduce(List<WordReducerPredicate> predicates) {
		for (WordReducerPredicate predicate : predicates) {
			reduce(predicate);
		}
	}

	public List<Word5> getWordList() {
		return wordList;
	}
}
