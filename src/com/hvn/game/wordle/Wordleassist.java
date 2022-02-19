package com.hvn.game.wordle;

import java.util.List;

public class Wordleassist {
	public static final String Wordfile = "/home/hrishi/hrishi/work/projects/mini_projects/wordie/resources/all.txt";
	
	public static class CharBasedEliminator implements WordReducerPredicate {
		char ch;
		public CharBasedEliminator(char ch) {
			this.ch = ch;
		}
		@Override
		public boolean pass(Word5 word) {
			return word.contains(ch) ? false : true;
		}
		@Override
		public char getChar() {
			return ch;
		}
		
		@Override
		public String toString() {
			return "[" + ch + "] - X";
		}
		@Override
		public int getPriority() {
			return 3;
		}
	}

	public static class PositionalKeeper implements WordReducerPredicate {
		char ch;
		int indx;
		public PositionalKeeper(int indx, char ch) {
			this.indx = indx;
			this.ch = ch;
		}
		
		@Override
		public boolean pass(Word5 word) {
			return word.containsAt(ch, indx) ? true : false;
		}

		@Override
		public char getChar() {
			return ch;
		}
		
		@Override
		public String toString() {
			return "[" + ch + "] - C";
		}

		@Override
		public int getPriority() {
			return 1;
		}
	}

	public static class DisPositionalKeeper implements WordReducerPredicate {
		char ch;
		int indx;
		public DisPositionalKeeper(int indx, char ch) {
			this.indx = indx;
			this.ch = ch;
		}
		
		@Override
		public boolean pass(Word5 word) {
			if (!word.contains(ch))
				return false;
			
			return word.containsAt(ch, indx) ? false : true;
		}

		@Override
		public char getChar() {
			return ch;
		}
		
		@Override
		public String toString() {
			return "[" + ch + "] - I";
		}

		@Override
		public int getPriority() {
			return 2;
		}
	}


	public static void playWordie2(String path) throws Exception {
		WordBank bank = new WordBank(path);
		int attemptNo = 1;
		while (!bank.isEmpty()) {
			List<Word5> wordList = bank.getWordList();
			int size = wordList.size();
			System.out.println("\n==\nNumber of available words = " + size);

			if (wordList.size() < 20) {
				System.out.println("Remaining words:");

				for (Word5 word5 : wordList) {
					System.out.println(word5);
				}
			}
			System.out.println("-----\nAttempt No. " + attemptNo++ + "\n-----");
			WordProcessor processor = new WordProcessor(bank);
			Word5 guess = processor.nextGuess();
			System.out.println("Guess:\n" + guess);
			processor.collectAndConfirmFeedback();
			if (processor.isSolved()) {
				System.out.println("Solved! Thank you!");
				return;
			}
			
			List<WordReducerPredicate> predicates = processor.getPredicates();
			
			bank.reduce(predicates);
		}
		
		System.out.println("Can't guess the word. What is it??\nPlease add it to " + Wordfile + "\nThank you!!");
	}
	
	public static void main(String [] args) throws Exception {
		System.out.println(" __          __           _ _                       _     _   ");
		System.out.println(" \\ \\        / /          | | |        /\\           (_)   | |  ");
		System.out.println("  \\ \\  /\\  / /__  _ __ __| | | ___   /  \\   ___ ___ _ ___| |_ ");
		System.out.println("   \\ \\/  \\/ / _ \\| '__/ _` | |/ _ \\ / /\\ \\ / __/ __| / __| __|");
		System.out.println("    \\  /\\  / (_) | | | (_| | |  __// ____ \\\\__ \\__ \\ \\__ \\ |_ ");
		System.out.println("     \\/  \\/ \\___/|_|  \\__,_|_|\\___/_/    \\_\\___/___/_|___/\\__|");
		System.out.println("                                                              ");
		System.out.println("                                                              ");		                                                              

		System.out.println("\nYou can play Worldle from any of the following sites.\nIf you need any help, I am always available!\nAll the Best!!\n");
		System.out.println("https://octokatherine.github.io/word-master/");
		System.out.println("https://www.powerlanguage.co.uk/wordle/");
		System.out.println("----");
		
		if (args == null || args.length == 0) {
			System.out.println("Please provide path to Words Dictionary! ");
			return;
		}
		
		playWordie2(args[0]);
	}
}
