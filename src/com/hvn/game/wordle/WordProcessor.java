package com.hvn.game.wordle;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Scanner;

import com.hvn.game.wordle.Wordleassist.CharBasedEliminator;
import com.hvn.game.wordle.Wordleassist.PositionalKeeper;

public class WordProcessor {
	WordBank bank;
	Word5 guess = null;
	List<WordReducerPredicate> predicates = null;
	
	public WordProcessor(WordBank bank) {
		this.bank = bank;
	}

	/**
	 * This function makes the next guess - using the word bank and user choice
	 * 
	 * @return
	 */
	public Word5 nextGuess() {
		if (guess != null)
			return guess;
		
		boolean accepted = false;
		while (!accepted) {
			guess = chooseOption();
			accepted = WordleHelper.confirm("You chose:\n" + guess + "\nOk?\n");
		}
		return guess;
	}

	private Word5 chooseOption() {
		System.out.println("Choose Default Suggested Word:\t1");
		System.out.println("Choose Unique Alphabets Word:\t2");
		System.out.println("Or\nType your own:");
		Scanner sc = new Scanner(System.in);
		String feedback = sc.nextLine();

		if (feedback == null || feedback.isEmpty()) {
			System.out.println("Invalid input, please try again!");
			
			return chooseOption();
		}
		
		switch (feedback.charAt(0)) {
		case '1':
			return bank.nextGuess(false);

		case '2':
			return bank.nextGuess(true);
		}
		
		// Your word
		Word5 guess = Word5.makeWord(feedback);
		
		if (guess == null) {
			System.out.println("Invalid word: " + feedback);
			return chooseOption();
		}
		
		return guess;
	}

	public void collectAndConfirmFeedback() {
		System.out.println("\n---\nPlease provide feedback for each character as follows:");
		System.out.println("'X' : Alphabet does Not exist");
		System.out.println("'C' : Alphabet is at Correct location");
		System.out.println("'I' : Alphabet is at Incorrect location\n---\n");
		int indx = 0;
		List<WordReducerPredicate> chosenOptions = new ArrayList<WordReducerPredicate>();
		
		for (char ch : guess.alphabet) {
			chosenOptions.add(WordleHelper.getFeedback(indx++, ch));
		}
		
		
		if (!WordleHelper.confirm(Arrays.asList(chosenOptions.get(0).toString(), 
				chosenOptions.get(1).toString(),
				chosenOptions.get(2).toString(), 
				chosenOptions.get(3).toString(), 
				chosenOptions.get(4).toString()))) {
			collectAndConfirmFeedback();
			return;
		}
		
		this.predicates = chosenOptions;
	}

	public List<WordReducerPredicate> getPredicates() {
		List<WordReducerPredicate> retval = new ArrayList<WordReducerPredicate>();
		List<Character> chars = new ArrayList<Character>();
		predicates.sort(new Comparator<WordReducerPredicate>() {

			@Override
			public int compare(WordReducerPredicate o1, WordReducerPredicate o2) {
				if (o1.getPriority() == o2.getPriority())
					return 0;
				
				return o1.getPriority() > o2.getPriority() ? 1 : -1;
			}
		});
		// Collect c type predicates
		for (WordReducerPredicate predicate : predicates) {
			// Only Decide X
			if (predicate instanceof CharBasedEliminator && chars.contains(predicate.getChar())) {
				continue;
			}
			
			retval.add(predicate);
			chars.add(predicate.getChar());
		}
		
		return retval;
	}

	public boolean isSolved() {
		for (WordReducerPredicate predicate : predicates) {
			// Only Decide X
			if (!(predicate instanceof PositionalKeeper)) {
				return false;
			}				
		}
		
		return true;
	}

}
