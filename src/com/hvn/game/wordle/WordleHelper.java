package com.hvn.game.wordle;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

import com.hvn.game.wordle.Wordleassist.CharBasedEliminator;
import com.hvn.game.wordle.Wordleassist.DisPositionalKeeper;
import com.hvn.game.wordle.Wordleassist.PositionalKeeper;

public class WordleHelper {

	public static List<String> loadFile(String file) throws Exception {
		List<String> allWords = new ArrayList<String>();
		Scanner s = new Scanner(new File(file));
		while (s.hasNext()){
			allWords.add(s.next());
		}
		s.close();
		
		return allWords;
	}
	
	public static List<Word5> convert(List<String> words) {
		ArrayList<Word5> retval = new ArrayList<Word5>();
		for (String str : words) {
			if (str.length() != 5)
				continue;
			
			retval.add(new Word5(str));
		}
		
		return retval;
	}
	
	public static boolean confirm(List<String> prompt) {
		StringBuffer buff = new StringBuffer();
		for (String string : prompt) {
			buff.append(string).append("\n");
		}
		
		return confirm(buff.toString());
	}
	
	public static boolean confirm(String prompt) {
		System.out.println(prompt + " - Y/N");
		Scanner sc = new Scanner(System.in);
		String feedback = sc.nextLine();

		if (null == feedback || feedback.isEmpty()) {
			System.out.println("Invalid input, please try again!");
			
			return confirm(prompt);
		}
		
		switch (feedback.charAt(0)) {
		case 'y':
		case 'Y':
			return true;

		case 'n':
		case 'N':
			return false;

		default:
			System.out.println("Invalid input. Try again");
			return confirm(prompt);
		}	
	}

	public static WordReducerPredicate getFeedback(int index, char ch) {
		System.out.println("\n--\n[" + (index + 1) +"] - Alphabet: '" + ch + "' - X/C/I ?:");
		Scanner sc=new Scanner(System.in);
		String feedback = sc.nextLine();

		if (null == feedback || feedback.isEmpty()) {
			System.out.println("Invalid input, please try again!");
			
			return getFeedback(index, ch);
		}
		switch (feedback.charAt(0)) {
		case 'x':
		case 'X':
			return new CharBasedEliminator(ch);

		case 'c':
		case 'C':
			return new PositionalKeeper(index, ch);
		
		case 'i':
		case 'I':
			return new DisPositionalKeeper(index, ch);


		default:
			System.out.println("Invalid input, please try again!");
			return getFeedback(index, ch);
		}		
	}
}
